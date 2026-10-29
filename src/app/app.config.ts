import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter, withComponentInputBinding, withHashLocation, withNavigationErrorHandler } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { I18nTitleStrategy } from './core/i18n/title-strategy';
import { mockApiInterceptor } from './core/mock-api.interceptor';
import { reloadOnStaleBuild } from './core/stale-build';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Hash URLs (#/creator) work on any static host, without server rewrite rules.
    provideRouter(routes, withComponentInputBinding(), withHashLocation(), withNavigationErrorHandler(reloadOnStaleBuild)),
    // No backend: the demo server in src/app/mock-server answers every /api request.
    provideHttpClient(withInterceptors([authInterceptor, mockApiInterceptor])),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
    // Restore the session before the first route is checked.
    provideAppInitializer(() => inject(AuthService).restore()),
  ],
};
