/**
 * Sign in with OpenRouter.
 *
 * Adapted from the OpenRouter team's `sign-in-with-openrouter` (MIT) and the
 * `openrouter-oauth` skill in `OpenRouterTeam/skills`. The flow is PKCE: no
 * client id, no secret, no backend. The founder signs in on their own
 * browser and the key never touches our server except as a request header.
 *
 * The key lives in localStorage so a second tab can use it. The verifier
 * lives in sessionStorage because it is a one-time secret.
 */
const STORAGE_KEY = 'openrouter_api_key';
const VERIFIER_KEY = 'openrouter_code_verifier';

type AuthListener = () => void;
const listeners = new Set<AuthListener>();

export const onAuthChange = (fn: AuthListener): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = (): void => {
  for (const fn of listeners) fn();
};

if (typeof window !== 'undefined') {
  // Another tab signed in or out.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) notify();
  });
}

export const getApiKey = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

export const setApiKey = (key: string): void => {
  localStorage.setItem(STORAGE_KEY, key);
  notify();
};

export const clearApiKey = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  notify();
};

/**
 * Only consume a `?code=` that this tab asked for. Another route, or another
 * piece of code on the page, may use the same parameter for something else.
 */
export const hasOAuthCallbackPending = (): boolean =>
  typeof window !== 'undefined' && sessionStorage.getItem(VERIFIER_KEY) !== null;

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function computeS256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** Send the founder to OpenRouter to sign in. */
export async function initiateOAuth(callbackUrl?: string): Promise<void> {
  const verifier = generateCodeVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await computeS256Challenge(verifier);
  const url = callbackUrl ?? `${window.location.origin}${window.location.pathname}`;
  window.location.href = `https://openrouter.ai/auth?${new URLSearchParams({
    callback_url: url,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })}`;
}

/** Exchange the returned code for the key, and clean the URL. */
export async function handleOAuthCallback(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('No sign-in was started in this tab.');
  sessionStorage.removeItem(VERIFIER_KEY);

  const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
  });
  if (!response.ok) throw new Error(`The key exchange failed (${response.status}).`);

  const body = (await response.json()) as { key?: string };
  if (!body.key) throw new Error('OpenRouter returned no key.');

  setApiKey(body.key);
  history.replaceState({}, '', window.location.pathname + window.location.hash);
}

/** Finish a sign-in if the page was opened with a `?code=`. */
export async function completeOAuthIfPending(): Promise<boolean> {
  if (!hasOAuthCallbackPending()) return false;
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return false;
  await handleOAuthCallback(code);
  return true;
}
