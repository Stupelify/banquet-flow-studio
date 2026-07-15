/** Session hydration flag — avoids circular imports between api.ts and authStore */
let authHydrationComplete = false;

export function setAuthHydrationComplete(complete: boolean): void {
  authHydrationComplete = complete;
}

export function isAuthHydrationComplete(): boolean {
  return authHydrationComplete;
}
