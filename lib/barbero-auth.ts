export const BARBERO_PIN = "0106";
export const BARBERO_AUTH_KEY = "barberia_barbero_session";
export const BARBERO_AUTH_VALUE = "authorized";

export function isBarberoAuthorized(): boolean {
  try {
    return sessionStorage.getItem(BARBERO_AUTH_KEY) === BARBERO_AUTH_VALUE;
  } catch {
    return false;
  }
}

export function grantBarberoAccess(): void {
  try {
    sessionStorage.setItem(BARBERO_AUTH_KEY, BARBERO_AUTH_VALUE);
  } catch {
    /* private browsing / storage blocked */
  }
}
