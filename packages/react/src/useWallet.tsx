import { useStore } from "@nanostores/react"
import { Cluster, initStore } from "@solana-wallets-solid/core"
import { createContext, useContext, useEffect } from "react"

export type WalletProviderProps = {
  autoConnect: boolean
  disconnectOnAccountChange: boolean
  env?: Cluster
  localStorageKey: string
  children?: React.ReactNode
}

export type WalletContext = {
  wallets: ReturnType<ReturnType<typeof initStore>["$wallets"]["get"]>
  walletsByName: ReturnType<ReturnType<typeof initStore>["$walletsMap"]["get"]>
  connectedAccount: ReturnType<ReturnType<typeof initStore>["$connectedAccount"]["get"]>
  connected: ReturnType<ReturnType<typeof initStore>["$isConnected"]["get"]>
  wallet: ReturnType<ReturnType<typeof initStore>["$wallet"]["get"]>
  env: ReturnType<ReturnType<typeof initStore>["$env"]["get"]>
  connecting: ReturnType<ReturnType<typeof initStore>["$connecting"]["get"]>
  disconnecting: ReturnType<ReturnType<typeof initStore>["$disconnecting"]["get"]>
  signMessage: ReturnType<typeof initStore>["signMessage"]
  signTransactionV1: ReturnType<typeof initStore>["signTransactionV1"]
  signAllTransactionsV1: ReturnType<typeof initStore>["signAllTransactionsV1"]
  sendTransactionV1: ReturnType<typeof initStore>["sendTransactionV1"]
  getTransactionSendingSigner: ReturnType<typeof initStore>["getTransactionSendingSigner"]
}
const WalletContext = createContext<WalletContext>({} as WalletContext)

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
} = initStore({ autoConnect: true, disconnectOnAccountChange: true })

const WalletProvider: React.FC<WalletProviderProps> = ({ children, ...config }) => {
  const wallets = useStore($wallets)
  const walletsByName = useStore($walletsMap)
  const connectedAccount = useStore($connectedAccount)
  const connected = useStore($isConnected)
  const wallet = useStore($wallet)
  const env = useStore($env)
  const connecting = useStore($connecting)
  const disconnecting = useStore($disconnecting)

  useEffect(() => {
    const cleanup = initOnMount()
    return cleanup
  }, [])

  return (
    <WalletContext.Provider
      value={{
        wallets,
        walletsByName,
        connectedAccount,
        connected,
        wallet,
        env,
        connecting,
        disconnecting,
        signMessage,
        signTransactionV1,
        signAllTransactionsV1,
        sendTransactionV1,
        getTransactionSendingSigner,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
function useWallet() {
  return useContext(WalletContext)
}
export { useWallet, WalletProvider }
