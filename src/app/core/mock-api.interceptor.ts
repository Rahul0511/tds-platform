import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, from, map } from 'rxjs';
import { handle } from '../mock-server/api.js';

const TOKEN_KEY = 'tds.session';
/** Feels like a network round trip, so loading states show as they would with a server. */
const LATENCY_MS = 120;

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Plays the role of the session cookie: kept for 14 days with "Keep me signed in", else for this tab only. */
function storeToken(session: { token: string | null; remember?: boolean } | undefined) {
  if (!session || session.token === undefined) return;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (session.token) (session.remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, session.token);
  } catch {
    /* storage blocked: the session lasts until reload */
  }
}

/**
 * There is no backend: every /api request is answered by the demo server in
 * src/app/mock-server, which runs the v0.2 server logic on a SQLite database
 * kept in this browser. Other requests pass through.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  const [path, search] = req.url.slice(4).split('?');
  const query: Record<string, string> = Object.fromEntries(new URLSearchParams(search ?? ''));
  for (const k of req.params.keys()) query[k] = req.params.get(k) ?? '';
  const body = req.body === null || req.body === undefined ? null : structuredClone(req.body);

  return from(handle({ method: req.method, path, query, body, token: readToken() })).pipe(
    delay(LATENCY_MS),
    map((res) => {
      storeToken(res.session);
      if (res.status >= 400) throw new HttpErrorResponse({ status: res.status, error: res.body, url: req.url, statusText: 'Error' });
      return new HttpResponse({ status: res.status, body: res.body, url: req.url });
    }),
  );
};
