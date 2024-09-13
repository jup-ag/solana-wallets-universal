import { useStore } from "@nanostores/solid"
import { Adapter, WalletError, WalletReadyState } from "@solana/wallet-adapter-base"
import { createContextProvider } from "@solid-primitives/context"
import {
  $account,
  $wallet,
  $connected,
  $connecting,
  $env,
  $name,
  $publicKey,
  $ready,
  $wallets,
  $walletsMap,
  connect,
  select,
  disconnect,
  onMountClearAdapterEventListeners,
  onMountAutoConnect,
  onMountLoadWallets,
} from "./wallet-store"
import { onCleanup, onMount } from "solid-js"

export type Cluster = "devnet" | "testnet" | "mainnet-beta"

export type Wallet = {
  adapter: Adapter
  readyState: WalletReadyState
}

export type ErrorHandler = (error: WalletError) => void
export type WalletPropsConfig = {
  autoConnect: boolean | ((adapter: Adapter) => boolean)
  disconnectOnAccountChange: boolean
  localStorageKey: string
  wallets: Adapter[]
}
export type WalletProviderProps = {
  autoConnect: boolean | ((adapter: Adapter) => boolean)
  disconnectOnAccountChange: boolean
  wallets: Wallet[]
  env?: Cluster
  localStorageKey: string
}

const [WalletProvider, _useWallet] = createContextProvider((props: WalletProviderProps) => {
  const wallets = useStore($wallets)
  const walletsByName = useStore($walletsMap)
  const publicKey = useStore($publicKey)
  const connected = useStore($connected)
  const account = useStore($account)
  const wallet = useStore($wallet)
  const name = useStore($name)
  const env = useStore($env)
  const connecting = useStore($connecting)
  const disconnecting = useStore
  const ready = useStore($ready)

  // Selected wallet connection state

  onMount(async () => {
    const cleanup = onMountClearAdapterEventListeners()
    onMountLoadWallets()
    onMountClearAdapterEventListeners
    await onMountAutoConnect()
    onCleanup(() => {
      cleanup()
    })
  })

  return {
    env,
    name,
    publicKey,
    connected,
    connecting,
    disconnecting,
    localStorageKey: props.localStorageKey,
    ready,
    account,
    wallet,
    wallets,
    walletsByName,

    // signTransaction,
    // signMessage,
    // signAllTransactions,
    // sendTransaction,
    //
    // autoConnect,
    // connect,
    // disconnect,
    // select,
  }
})

const useWallet = () => {
  const context = _useWallet()
  if (!context) {
    throw new Error("useWalelt must be used within a WalletProvider")
  }
  return context
}

export { WalletProvider, useWallet, connect, disconnect, select }
