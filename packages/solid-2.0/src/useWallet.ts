import { useStore } from "@nanostores/solid"
import { createEffect, onCleanup, onMount } from "solid-js"
import {
  initStore,
  dispatchConnect,
  dispatchDisconnect,
  StoreProps,
} from "@solana-wallets/core-2.0"
import type {} from "@solana-mobile/wallet-adapter-mobile"

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
    getTransactionSendingSigner,
  } = initStore({
    env: props.env,
    autoConnect: props.autoConnect,
    disconnectOnAccountChange: props.disconnectOnAccountChange,
    localStorageKey: props.localStorageKey,
    additionalWallets: props.additionalWallets,
  })
  const wallets = useStore($wallets)
  const walletsByName = useStore($walletsMap)
  const connectedAccount = useStore($connectedAccount)
  const connected = useStore($isConnected)
  const wallet = useStore($wallet)
  const env = useStore($env)
  const connecting = useStore($connecting)
  const disconnecting = useStore($disconnecting)

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
    getTransactionSendingSigner,
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
export type * from "@solana-wallets/core-2.0"
