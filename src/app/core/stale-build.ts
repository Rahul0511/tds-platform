import { NavigationError } from '@angular/router';

const KEY = 'tds.reloadedFor';
const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

/**
 * A tab opened before a new version was deployed still asks for the old code
 * chunks, which no longer exist. Instead of a navigation that silently does
 * nothing, reload the page once at the target URL to get the current version.
 */
export function reloadOnStaleBuild(e: NavigationError): void {
  const message = e.error instanceof Error ? e.error.message : String(e.error);
  if (!CHUNK_ERROR.test(message)) return;
  try {
    if (sessionStorage.getItem(KEY) === e.url) return; // already reloaded once for this URL: give up, avoid a loop
    sessionStorage.setItem(KEY, e.url);
  } catch {
    /* storage blocked: still reload once */
  }
  location.assign(e.url);
}

/** Call after a successful navigation, so a later deployment can trigger a reload again. */
export function clearStaleBuildFlag(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
}
