export const KEYS = {
  WALLET_NAME: "unified:connected_wallet_name",
} as const
export type Keys = (typeof KEYS)[keyof typeof KEYS]
export function getLocalStorage<T>(
  key: string,
  defaultValue: T | undefined = undefined,
): T | undefined {
  try {
    const value = localStorage.getItem(key)
    if (!value) {
      return
    }
    return JSON.parse(value) as T
  } catch (error) {
    if (typeof window !== "undefined") {
      console.error(error)
    }
  }
  return defaultValue
}

/**
 * Adds the provided value with the given key to
 * localstorage IF value is defined, otherwise removes
 * key entry from localstorage
 */
export function setLocalStorage<T>(key: string, value: T | undefined = undefined): void {
  try {
    if (value == null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch (error) {
    if (typeof window !== "undefined") {
      console.error(error)
    }
  }
}
