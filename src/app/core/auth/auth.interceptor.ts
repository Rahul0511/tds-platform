import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Session expired or revoked: send the user to the login page and come back afterwards. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && !req.url.includes('/api/auth/')) {
        if (err.status === 401 && auth.isSignedIn()) auth.signedOut(router.url);
        if (err.status === 403 && err.error?.code === 'PASSWORD_CHANGE_REQUIRED') void router.navigate(['/set-password']);
      }
      return throwError(() => err);
    }),
  );
};
