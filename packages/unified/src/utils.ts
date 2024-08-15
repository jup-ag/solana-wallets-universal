export const isMobile = () => typeof window !== "undefined" && screen && screen.width <= 480

/**
 * Users on iOS can be redirected into a wallet's in-app browser automatically,
 * if that wallet has a universal link configured to do so
 * But should not be redirected from within a webview, eg. if they're already
 * inside a wallet's browser
 * This function can be used to identify users who are on iOS and can be redirected
 *
 * @returns true if the user can be redirected
 */
export function isIosAndRedirectable() {
  // SSR: return false
  if (typeof window === "undefined" || !navigator) {
    return false
  }

  const userAgent = navigator.userAgent.toLowerCase()

  // if on iOS the user agent will contain either iPhone or iPad
  // caveat: if requesting desktop site then this won't work
  const isIos = userAgent.includes("iphone") || userAgent.includes("ipad")

  // if in a webview then it will not include Safari
  // note that other iOS browsers also include Safari
  // so we will redirect only if Safari is also included
  const isSafari = userAgent.includes("safari")

  return isIos && isSafari
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
