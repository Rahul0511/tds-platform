import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { I18nTitleStrategy } from './core/i18n/title-strategy';
import { reloadOnStaleBuild } from './core/stale-build';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withNavigationErrorHandler(reloadOnStaleBuild)),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
    // Restore the session from the cookie before the first route is checked.
    provideAppInitializer(() => inject(AuthService).restore()),
  ],
};
