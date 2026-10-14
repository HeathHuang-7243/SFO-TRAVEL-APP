const key = "sfo-welcome-dismissed:v1";

export function shouldShowWelcome() {
  try {
    return localStorage.getItem(key) !== "true";
  } catch {
    return true;
  }
}

export function saveWelcomeChoice(dismissed: boolean) {
  if (dismissed) localStorage.setItem(key, "true");
  else localStorage.removeItem(key);
}
