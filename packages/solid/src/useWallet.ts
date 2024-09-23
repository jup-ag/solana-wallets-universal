import { useStore } from "@nanostores/solid"
import { createContextProvider } from "@solid-primitives/context"
import { onCleanup, onMount } from "solid-js"
import { Cluster, initStore, dispatchConnect, dispatchDisconnect } from "@solana-wallets-solid/core"
import {} from "@solana/wallet-adapter-base"

export type WalletProviderProps = {
  autoConnect: boolean
  disconnectOnAccountChange: boolean
  env?: Cluster
  localStorageKey: string
}

const [WalletProvider, _useWallet] = createContextProvider((props: WalletProviderProps) => {
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
    signTransactionV1,
    signAllTransactionsV1,
    sendTransactionV1,
    getTransactionSendingSigner,
  } = initStore({
    env: props.env,
    autoConnect: props.autoConnect,
    disconnectOnAccountChange: props.disconnectOnAccountChange,
  })
  const wallets = useStore($wallets)
  const walletsByName = useStore($walletsMap)
  const connectedAccount = useStore($connectedAccount)
  const connected = useStore($isConnected)
  const wallet = useStore($wallet)
  const env = useStore($env)
  const connecting = useStore($connecting)
  const disconnecting = useStore($disconnecting)

  // Selected wallet connection state

  onMount(() => {
    const cleanup = initOnMount()
    if (cleanup) {
      onCleanup(() => {
        cleanup()
      })
    }
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
    signTransactionV1,
    signAllTransactionsV1,
    sendTransactionV1,
    getTransactionSendingSigner,
    // signTransaction,
    // signMessage,
    // signAllTransactions,
    // sendTransaction,
    //
  }
})

const useWallet = () => {
  const context = _useWallet()
  if (!context) {
    throw new Error("useWalelt must be used within a WalletProvider")
  }
  return context
}

export { WalletProvider, useWallet }
