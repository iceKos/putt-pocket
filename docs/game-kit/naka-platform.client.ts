/**
 * NAKALITE platform helpers for a GAME CLIENT (the page that runs in the iframe). Copy this file into your game client (no dependencies).
 *
 * Two channels, never mixed:
 *  - the launch token (URL fragment) and your own WebSocket/HTTP to YOUR game server: they decide the match and the coins; the page cannot touch them;
 *  - postMessage to the platform page around you: UI only (ready / ended / leave). Never put a secret or anything that changes a balance in it.
 */

/** True when this page runs inside another page (the platform's frame). */
export const embedded: boolean = typeof window !== 'undefined' && window.parent !== window;

/**
 * Reads `#token=...` and removes it from the address bar at once, so it is not copied, bookmarked or shown. Returns null when there is none
 * (the game was opened on its own). Send the token to YOUR game server; the server asks the platform who it is.
 */
export function takeLaunchToken(): string | null {
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get('token');
  if (token !== null) history.replaceState(null, '', location.pathname + location.search);
  return token || null;
}

/** The session id the platform put in the query (`?session=...`). Not a secret. */
export const sessionIdFromUrl = (): string | null => new URLSearchParams(location.search).get('session');

function parentOrigin(): string {
  try {
    return document.referrer ? new URL(document.referrer).origin : '*';
  } catch {
    return '*';
  }
}

export type PlatformEvent =
  | { type: 'ready' } // the game is loaded and shows its first screen: the platform hides its "Loading" cover
  | { type: 'ended'; won?: boolean } // the match ended: the platform starts looking for the result (the real result comes from the platform, not from this)
  | { type: 'leave' }; // the player pressed your Back / Menu button: the platform takes them back to the party lobby

/** Tells the platform page something about the UI. Does nothing when the game is opened on its own. */
export function toPlatform(event: PlatformEvent): void {
  if (!embedded) return;
  window.parent.postMessage({ source: 'nakalite-game', ...event }, parentOrigin());
}
