import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ROLE_INFO, ROLES } from '../../core/auth/roles';
import { DialogService } from '../../core/dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AuditEntry, Role, User } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PaginationComponent, Paginator } from '../../shared/ui/pagination.component';
import { TimeAgoPipe } from '../../shared/ui/time-ago.pipe';

type Tab = 'users' | 'roles' | 'log';

interface UserDraft {
  id?: number;
  username: string;
  display_name: string;
  email: string;
  role: Role;
}

/** Permission matrix shown on the "Roles & permissions" tab. Mirrors the server rules. */
const PERMISSIONS: { area: string; label: string; min: Role }[] = [
  { area: 'TDS', label: 'View products, TDS preview and history', min: 'viewer' },
  { area: 'TDS', label: 'Download and print TDS (PDF / ZIP)', min: 'viewer' },
  { area: 'Data', label: 'Create, edit, copy and delete products', min: 'editor' },
  { area: 'Data', label: 'Manage lookup values (drop-downs)', min: 'editor' },
  { area: 'Data', label: 'Edit TDS text blocks and header rules', min: 'editor' },
  { area: 'Admin', label: 'Document settings (region, titles)', min: 'admin' },
  { area: 'Admin', label: 'Add users, change roles, reset passwords', min: 'admin' },
  { area: 'Admin', label: 'View the security log', min: 'admin' },
];

const AUDIT_LABELS: Partial<Record<string, { label: string; badge: string }>> = {
  'auth.login': { label: 'Signed in', badge: 'badge-green' },
  'auth.login_failed': { label: 'Failed sign-in', badge: 'badge-red' },
  'user.created': { label: 'User created', badge: 'badge-brand' },
  'user.updated': { label: 'User changed', badge: 'badge-blue' },
  'user.deleted': { label: 'User deleted', badge: 'badge-red' },
  'user.password_reset': { label: 'Password reset', badge: 'badge-amber' },
  'user.password_changed': { label: 'Password changed', badge: 'badge-neutral' },
};

@Component({
  selector: 'app-users',
  imports: [FormsModule, DatePipe, AvatarComponent, IconComponent, PaginationComponent, TimeAgoPipe, TranslatePipe],
  templateUrl: './users.component.html',
})
export class UsersComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly roles = ROLES;
  readonly roleInfo = ROLE_INFO;
  readonly permissions = PERMISSIONS;
  readonly auditLabels = AUDIT_LABELS;

  readonly tab = signal<Tab>('users');
  readonly users = signal<User[]>([]);
  readonly audit = signal<AuditEntry[]>([]);
  readonly auditTotal = signal(0);
  readonly auditPage = signal(1);
  readonly auditSize = signal(25);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly roleFilter = signal<Role | ''>('');

  /** Add / edit form (null = closed). */
  readonly draft = signal<UserDraft | null>(null);
  readonly draftErrors = signal<Record<string, string>>({});
  readonly saving = signal(false);

  /** One-time password to hand over (null = closed). */
  readonly handover = signal<{ user: User; password: string; reason: 'created' | 'reset' } | null>(null);
  readonly copied = signal(false);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const r = this.roleFilter();
    return this.users().filter(
      (u) => (!r || u.role === r) && (!q || [u.display_name, u.username, u.email ?? ''].some((v) => v.toLowerCase().includes(q))),
    );
  });

  readonly usersPager = new Paginator(this.filtered, 25);

  readonly stats = computed(() => {
    const list = this.users();
    return [
      { label: 'Users', value: list.length, icon: 'users' as const },
      { label: 'Active', value: list.filter((u) => u.active).length, icon: 'check-circle' as const },
      { label: 'Admins', value: list.filter((u) => u.role === 'admin' && u.active).length, icon: 'shield' as const },
      { label: 'Awaiting first sign-in', value: list.filter((u) => u.active && u.must_change_password).length, icon: 'key' as const },
    ];
  });

  constructor() {
    this.load();
  }

  load() {
    this.api.users().subscribe({
      next: (u) => {
        this.users.set(u);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e, 'Could not load users');
      },
    });
    this.loadAudit();
  }

  /** The security log is paged on the server: it grows with every sign-in. */
  loadAudit(page = this.auditPage()) {
    this.auditPage.set(page);
    this.api.audit(this.auditSize(), (page - 1) * this.auditSize()).subscribe({
      next: (r) => {
        this.audit.set(r.items);
        this.auditTotal.set(r.total);
      },
      error: () => {},
    });
  }

  roleAllowed(role: Role, min: Role) {
    return ROLES.indexOf(role) >= ROLES.indexOf(min);
  }

  countRole(role: Role) {
    return this.users().filter((u) => u.role === role && u.active).length;
  }

  isSelf(u: User) {
    return u.id === this.auth.user()?.id;
  }

  // ---- Add / edit ----

  openCreate() {
    this.draftErrors.set({});
    this.draft.set({ username: '', display_name: '', email: '', role: 'viewer' });
  }

  openEdit(u: User) {
    this.draftErrors.set({});
    this.draft.set({ id: u.id, username: u.username, display_name: u.display_name, email: u.email ?? '', role: u.role });
  }

  patchDraft(patch: Partial<UserDraft>) {
    this.draft.update((d) => (d ? { ...d, ...patch } : d));
  }

  saveDraft() {
    const d = this.draft();
    if (!d) return;
    this.saving.set(true);
    const done = () => this.saving.set(false);
    const fail = (e: HttpErrorResponse) => {
      done();
      this.draftErrors.set(e.error?.fields ?? {});
      if (!e.error?.fields) this.toast.error(e, 'Could not save the user');
    };

    if (d.id) {
      this.api.updateUser(d.id, { display_name: d.display_name, email: d.email, role: d.role }).subscribe({
        next: (u) => {
          done();
          this.replace(u);
          this.draft.set(null);
          this.toast.success(this.i18n.t('Saved {name}', { name: u.display_name }));
          this.refreshAudit();
        },
        error: fail,
      });
    } else {
      this.api.createUser({ username: d.username, display_name: d.display_name, email: d.email || null, role: d.role }).subscribe({
        next: ({ user, tempPassword }) => {
          done();
          this.users.update((list) => [...list, user]);
          this.draft.set(null);
          this.showHandover(user, tempPassword, 'created');
          this.refreshAudit();
        },
        error: fail,
      });
    }
  }

  // ---- Row actions ----

  changeRole(u: User, role: Role, select: HTMLSelectElement) {
    if (role === u.role) return;
    this.api.updateUser(u.id, { role }).subscribe({
      next: (saved) => {
        this.replace(saved);
        this.toast.success(this.i18n.t('{name} is now {role}', { name: saved.display_name, role: this.i18n.t(ROLE_INFO[role].label) }));
        this.refreshAudit();
      },
      error: (e: HttpErrorResponse) => {
        select.value = u.role; // undo the choice in the drop-down
        this.toast.error(null, (Object.values(e.error?.fields ?? {})[0] as string) ?? 'Could not change the role');
      },
    });
  }

  async toggleActive(u: User) {
    if (u.active) {
      const ok = await this.dialog.confirm({
        title: this.i18n.t('Deactivate {name}?', { name: u.display_name }),
        message: 'They are signed out at once and cannot sign in until you activate the account again. Their changes stay in the history.',
        confirmText: 'Deactivate',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.api.updateUser(u.id, { active: !u.active }).subscribe({
      next: (saved) => {
        this.replace(saved);
        this.toast.success(this.i18n.t(saved.active ? '{name} activated' : '{name} deactivated', { name: saved.display_name }));
        this.refreshAudit();
      },
      error: (e: HttpErrorResponse) => this.toast.error(null, (Object.values(e.error?.fields ?? {})[0] as string) ?? 'Could not change the status'),
    });
  }

  async resetPassword(u: User) {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('Reset the password of {name}?', { name: u.display_name }),
      message: 'A new one-time password is created and all their sessions are ended. They must choose a new password at the next sign-in.',
      confirmText: 'Reset password',
    });
    if (!ok) return;
    this.api.resetPassword(u.id).subscribe({
      next: ({ user, tempPassword }) => {
        this.replace(user);
        this.showHandover(user, tempPassword, 'reset');
        this.refreshAudit();
      },
      error: (e) => this.toast.error(e, 'Could not reset the password'),
    });
  }

  async remove(u: User) {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('Delete {name}?', { name: u.display_name }),
      message: 'The account is removed for good. Their name stays in the change history. Deactivating is usually the better choice.',
      confirmText: 'Delete user',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteUser(u.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((x) => x.id !== u.id));
        this.toast.success(this.i18n.t('Deleted {name}', { name: u.display_name }));
        this.refreshAudit();
      },
      error: (e: HttpErrorResponse) => this.toast.error(null, (Object.values(e.error?.fields ?? {})[0] as string) ?? 'Could not delete'),
    });
  }

  // ---- One-time password hand-over ----

  async copyPassword() {
    const h = this.handover();
    if (!h) return;
    try {
      await navigator.clipboard.writeText(h.password);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.toast.error(null, 'Copy failed. Select the password and copy it by hand.');
    }
  }

  private showHandover(user: User, password: string, reason: 'created' | 'reset') {
    this.copied.set(false);
    this.handover.set({ user, password, reason });
  }

  private replace(u: User) {
    this.users.update((list) => list.map((x) => (x.id === u.id ? u : x)));
  }

  private refreshAudit() {
    this.loadAudit();
  }
}
