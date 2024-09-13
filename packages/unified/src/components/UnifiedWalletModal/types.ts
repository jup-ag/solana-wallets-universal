import { WalletAdapterCompatibleStandardWallet } from "@solana/wallet-adapter-base"

type StandardWalletInfo = {
  type: "standard-wallet"
  wallet: WalletAdapterCompatibleStandardWallet
}

type DeeplinkWalletInfo = {
  type: "mobile-deeplink"
  name: string
  icon: string
  deeplink: string
}

export type WalletInfo = StandardWalletInfo | DeeplinkWalletInfo
