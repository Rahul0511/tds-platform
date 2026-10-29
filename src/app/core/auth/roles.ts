import { Access, ScopeRole, User } from '../models';

/** Roles per region and business unit, from least to most rights; each includes the ones before it. */
export const ROLES: ScopeRole[] = ['viewer', 'editor', 'bu_admin'];

/** '*' in an assignment = every region / every business unit. */
export const ALL = '*';

export const ROLE_INFO: Record<ScopeRole, { label: string; badge: string; description: string; rights: string[] }> = {
  viewer: {
    label: 'Viewer',
    badge: 'badge-neutral',
    description: 'Reads data and creates TDS documents.',
    rights: ['View products and history', 'Preview, print and download TDS'],
  },
  editor: {
    label: 'Editor',
    badge: 'badge-blue',
    description: 'Writes and maintains the TDS of the region and business unit.',
    rights: ['Everything a viewer can do', 'Create, edit and delete products', 'Translate the texts of the business unit'],
  },
  bu_admin: {
    label: 'BU admin',
    badge: 'badge-violet',
    description: 'Owns the templates and standard texts of the business unit.',
    rights: ['Everything an editor can do', 'Templates and phrase library of the business unit', 'Drop-down lists and company line of the business unit'],
  },
};

export const SYSTEM_ADMIN_INFO = {
  label: 'System admin',
  badge: 'badge-brand',
  description: 'All rights in every region and business unit, plus users, regions, business units and languages.',
};

const rank = (r: ScopeRole | null | undefined) => (r ? ROLES.indexOf(r) : -1);

const covers = (a: Access, region: string, bu: string) => (a.region_code === ALL || a.region_code === region) && (a.bu_code === ALL || a.bu_code === bu);

/** The user's role in a region and business unit (ALL asks for every one at once), or null. */
export function roleIn(user: User | null | undefined, region: string, bu: string): ScopeRole | null {
  if (!user) return null;
  if (user.is_admin) return 'bu_admin';
  let best: ScopeRole | null = null;
  for (const a of user.access ?? []) if (covers(a, region, bu) && rank(a.role) > rank(best)) best = a.role;
  return best;
}

export const can = (user: User | null | undefined, min: ScopeRole, region: string, bu: string) => rank(roleIn(user, region, bu)) >= rank(min);

/** Has the role in at least one region and business unit. */
export const canAnywhere = (user: User | null | undefined, min: ScopeRole) =>
  !!user && (user.is_admin || (user.access ?? []).some((a) => rank(a.role) >= rank(min)));

/** Highest role the user has anywhere (for the user menu). */
export function topRole(user: User | null | undefined): ScopeRole | null {
  if (!user) return null;
  return (user.access ?? []).reduce<ScopeRole | null>((best, a) => (rank(a.role) > rank(best) ? a.role : best), null);
}
