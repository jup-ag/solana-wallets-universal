import "@solana-wallets/unified/index.css"
import "./app.css"

import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense } from "solid-js"
import { WalletProvider } from "@solana-wallets/solid-2.0"
import { UnifiedWalletProviderProps, UnifiedWalletButtonProps } from "@solana-wallets/unified"

import Nav from "~/components/Nav"

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "unified-wallet-modal": UnifiedWalletProviderProps
    }
    interface IntrinsicElements {
      "unified-wallet-modal-button": UnifiedWalletButtonProps
    }
  }
}

export default function App() {
  // const adapters: StoreProps = [
  // new CoinbaseWalletAdapter(),
  // new TrezorWalletAdapter(),
  // new LedgerWalletAdapter(),
  // new SolflareWalletAdapter(),
  // new WalletConnectWalletAdapter({
  //   network: WalletAdapterNetwork.Mainnet,
  //   options: {
  //     relayUrl: "wss://relay.walletconnect.com",
  //     projectId: WC_PROJECT_ID,
  //     metadata: {
  //       name: "Coinhall",
  //       description: "Coinhall",
  //       url: "https://coinhall.org",
  //       icons: ["https://coinhall.org/favicon.svg"],
  //     },
  //   },
  // }),
  // ]
  // const wallets: Wallet[] = adapters.map(a => ({ adapter: a, readyState: a.readyState }))
  // console.log("app wallets: ", wallets)
  return (
    <Router
      root={props => (
        <WalletProvider
          autoConnect={true}
          disconnectOnAccountChange={true}
          localStorageKey="unified:wallet-storage-key"
          env={"mainnet-beta"}
          additionalWallets={[]}
        >
          <Nav />
          <Suspense>{props.children}</Suspense>
          <unified-wallet-modal />
        </WalletProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
