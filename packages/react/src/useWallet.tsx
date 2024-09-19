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

const WalletContext = createContext({})

const WalletProvider: React.FC<WalletProviderProps> = ({ children, ...config }) => {
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
  } = initStore()
  const wallets = useStore($wallets)
  const walletsByName = useStore($walletsMap)
  const connectedAccount = useStore($connectedAccount)
  const connected = useStore($isConnected)
  const wallet = useStore($wallet)
  const env = useStore($env)
  const connecting = useStore($connecting)
  const disconnecting = useStore($disconnecting)

  // Selected wallet connection state

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
        signTransaction,
        signAllTransactions,
        sendTransaction,
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
