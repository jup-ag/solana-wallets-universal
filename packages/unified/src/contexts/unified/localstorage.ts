export const KEY = {
  PREVIOUSLY_CONNECTED: "unified:previously-connected",
} as const
export type Key = (typeof KEY)[keyof typeof KEY]
