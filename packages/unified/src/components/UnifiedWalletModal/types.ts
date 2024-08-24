import { Adapter } from "@solana/wallet-adapter-base"

type AdapterWalletInfo = {
  type: "adapter"
  adapter: Adapter
}

type DeeplinkWalletInfo = {
  type: "mobile-deeplink"
  name: string
  icon: string
  deeplink: string
}

export type WalletInfo = AdapterWalletInfo | DeeplinkWalletInfo
