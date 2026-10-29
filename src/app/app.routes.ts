import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, passwordChangeGuard, roleGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  // ---- Signed out ----
  {
    path: 'login',
    title: 'Sign in · TDS',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'set-password',
    title: 'Choose your password · TDS',
    canActivate: [passwordChangeGuard],
    loadComponent: () => import('./pages/auth/set-password.component').then((m) => m.SetPasswordComponent),
  },

  // ---- Signed in ----
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · TDS',
        data: { crumb: 'Dashboard' },
        loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'creator',
        title: 'TDS Creator · TDS',
        data: { crumb: 'TDS Creator' },
        loadComponent: () => import('./pages/tds-creator.component').then((m) => m.TdsCreatorComponent),
      },
      {
        path: 'database',
        data: { crumb: 'Data' },
        loadComponent: () => import('./pages/database/database.component').then((m) => m.DatabaseComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'products' },
          {
            path: 'products',
            title: 'Products · TDS',
            data: { crumb: 'Products' },
            loadComponent: () => import('./pages/database/products-list.component').then((m) => m.ProductsListComponent),
          },
          {
            path: 'products/new',
            title: 'New product · TDS',
            data: { crumb: 'New product' },
            canActivate: [roleGuard('editor')],
            loadComponent: () => import('./pages/database/product-form.component').then((m) => m.ProductFormComponent),
          },
          {
            path: 'products/:id',
            title: 'Product · TDS',
            data: { crumb: 'Edit product' },
            canActivate: [roleGuard('editor')],
            loadComponent: () => import('./pages/database/product-form.component').then((m) => m.ProductFormComponent),
          },
          {
            path: 'lookups',
            title: 'Lookups · TDS',
            data: { crumb: 'Lookups' },
            canActivate: [roleGuard('editor')],
            loadComponent: () => import('./pages/database/lookups.component').then((m) => m.LookupsComponent),
          },
          // The fixed texts of the first release now live in templates and phrases.
          { path: 'texts', redirectTo: '/templates' },
        ],
      },
      {
        path: 'templates',
        title: 'Templates · TDS',
        data: { crumb: 'Templates' },
        loadComponent: () => import('./pages/templates/templates.component').then((m) => m.TemplatesComponent),
      },
      {
        path: 'translations',
        title: 'Translations · TDS',
        data: { crumb: 'Translations' },
        canActivate: [roleGuard('editor')],
        loadComponent: () => import('./pages/translations/translations.component').then((m) => m.TranslationsComponent),
      },
      {
        path: 'history',
        title: 'Change history · TDS',
        data: { crumb: 'Change history' },
        loadComponent: () => import('./pages/history.component').then((m) => m.HistoryComponent),
      },
      {
        path: 'account',
        title: 'Account · TDS',
        data: { crumb: 'Account' },
        loadComponent: () => import('./pages/account.component').then((m) => m.AccountComponent),
      },
      {
        path: 'admin/users',
        title: 'Users & roles · TDS',
        data: { crumb: 'Users & roles' },
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'admin/organisation',
        title: 'Organisation · TDS',
        data: { crumb: 'Organisation' },
        canActivate: [roleGuard('bu_admin')],
        loadComponent: () => import('./pages/admin/organisation.component').then((m) => m.OrganisationComponent),
      },
      {
        path: 'forbidden',
        title: 'No access · TDS',
        data: { crumb: 'No access' },
        loadComponent: () => import('./pages/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
