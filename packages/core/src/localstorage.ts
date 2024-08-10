export function getLocalStorage<T>(
  key: string,
  defaultValue: T | undefined = undefined,
): T | undefined {
  try {
    const value = localStorage.getItem(key)
    if (value) return JSON.parse(value) as T
  } catch (error) {
    if (typeof window !== "undefined") {
      console.error(error)
    }
  }

  return defaultValue
}

export function setLocalStorage<T>(key: string, value: T | undefined = undefined): void {
  try {
    if (value === undefined) {
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
