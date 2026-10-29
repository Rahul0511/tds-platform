import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { ScopeRole } from '../models';
import { AuthService } from './auth.service';

/** Signed in, and the one-time password has been replaced. */
export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isSignedIn()) {
    const returnUrl = '/' + segments.map((s) => s.path).join('/');
    return router.createUrlTree(['/login'], { queryParams: returnUrl !== '/' ? { returnUrl } : {} });
  }
  if (auth.mustChangePassword()) return router.createUrlTree(['/set-password']);
  return true;
};

/** Only for signed-out users (login page). */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isSignedIn() ? inject(Router).createUrlTree([auth.mustChangePassword() ? '/set-password' : '/']) : true;
};

/** The forced password change after signing in with a one-time password. */
export const passwordChangeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isSignedIn()) return inject(Router).createUrlTree(['/login']);
  return auth.mustChangePassword() ? true : inject(Router).createUrlTree(['/']);
};

/** Needs this role in at least one region and business unit. The server checks the exact scope on every request. */
export const roleGuard =
  (min: ScopeRole): CanActivateFn =>
  () =>
    inject(AuthService).canAnywhere(min) ? true : inject(Router).createUrlTree(['/forbidden']);

/** System administrators only. */
export const adminGuard: CanActivateFn = () => (inject(AuthService).isAdmin() ? true : inject(Router).createUrlTree(['/forbidden']));
