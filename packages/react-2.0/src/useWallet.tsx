import { useStore } from "@nanostores/react"
import { Cluster, initStore } from "@solana-wallets/core-2.0"
import { createContext, useContext, useEffect, useRef } from "react"

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
  getTransactionSendingSigner: ReturnType<typeof initStore>["getTransactionSendingSigner"]
}
const WalletContext = createContext<WalletContext>({} as WalletContext)

const WalletProvider: React.FC<WalletProviderProps> = ({ children, ...config }) => {
  const store = useRef<ReturnType<typeof initStore>>(initStore(config))

  const wallets = useStore(store.current.$wallets)
  const walletsByName = useStore(store.current.$walletsMap)
  const connectedAccount = useStore(store.current.$connectedAccount)
  const connected = useStore(store.current.$isConnected)
  const wallet = useStore(store.current.$wallet)
  const env = useStore(store.current.$env)
  const connecting = useStore(store.current.$connecting)
  const disconnecting = useStore(store.current.$disconnecting)

  useEffect(() => {
    const cleanup = store.current.initOnMount()
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
        signMessage: store.current.signMessage,
        getTransactionSendingSigner: store.current.getTransactionSendingSigner,
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
export type * from "@solana-wallets/core-2.0"
