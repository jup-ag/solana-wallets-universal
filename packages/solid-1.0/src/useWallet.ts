import { useStore } from "@nanostores/solid"
import { Accessor, createEffect, onCleanup, onMount } from "solid-js"
import {
  initStore,
  dispatchConnect,
  dispatchDisconnect,
  StoreProps,
  WalletInfo,
  AccountInfo,
  Cluster,
} from "@solana-wallets/core-1.0"

import { createContextProvider } from "./context"

const [WalletProvider, _useWallet] = createContextProvider((props: StoreProps) => {
  const {
    $wallet,
    $connectedAccount,
    $connecting,
    $disconnecting,
    $isConnected,
    initOnMount,
    $env,
    $wallets,
    $walletsMap,
    signMessage,
    sendTransaction,
    signTransaction,
    signAllTransactions,
  } = initStore({
    env: props.env,
    autoConnect: props.autoConnect,
    disconnectOnAccountChange: props.disconnectOnAccountChange,
    localStorageKey: props.localStorageKey,
    additionalWallets: props.additionalWallets,
  })
  const wallets: Accessor<WalletInfo[]> = useStore($wallets)
  const walletsByName: Accessor<Record<string, WalletInfo>> = useStore($walletsMap)
  const connectedAccount: Accessor<AccountInfo | undefined> = useStore($connectedAccount)
  const connected: Accessor<boolean> = useStore($isConnected)
  const wallet: Accessor<WalletInfo | undefined> = useStore($wallet)
  const env: Accessor<Cluster> = useStore($env)
  const connecting: Accessor<boolean> = useStore($connecting)
  const disconnecting: Accessor<boolean> = useStore($disconnecting)

  onMount(() => {
    const cleanup = initOnMount()
    if (cleanup) {
      onCleanup(() => {
        cleanup()
      })
    }
  })

  createEffect(() => {
    console.log("env value: ", { env: env() })
  })

  return {
    env,
    connected,
    connecting,
    disconnecting,
    localStorageKey: props.localStorageKey,
    connectedAccount,
    wallet,
    wallets,
    walletsByName,

    connect: dispatchConnect,
    disconnect: dispatchDisconnect,

    signMessage,
    sendTransaction,
    signTransaction,
    signAllTransactions,
  }
})

const useWallet = () => {
  const context = _useWallet()
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

export { WalletProvider, useWallet }
export type * from "@solana-wallets/core-1.0"
