export const isBrowser = typeof window !== "undefined";

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Failed to load from localStorage", error);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save to localStorage", error);
  }
}
