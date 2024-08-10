import "./app.css"

import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense } from "solid-js"
import { Wallet, WalletProvider } from "@solana-wallets-solid/core"

/**
 * NOTE: import each wallet adapter idependently due to build
 * error when deploying on cloudflare-pages when importing
 * them all from @solana/wallet-adapter-wallets
 *
 * @see https://github.com/unjs/nitro/issues/1821
 */
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare"
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
} from "@solana-mobile/wallet-adapter-mobile"

import Nav from "~/components/Nav"

export default function App() {
  const adapters = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    /**
     * @see https://docs.solanamobile.com/reference/typescript/mobile-wallet-adapter#parameters
     */
    new SolanaMobileWalletAdapter({
      /**
       * The chain identifier for the chain with
       * which the dapp intends to interact;
       *
       * Supported values include "solana:mainnet",
       * "solana:testnet", "solana:devnet", "mainnet-beta",
       * "testnet", "devnet".
       *
       * If not set, defaults to "solana:mainnet".
       */
      chain: "solana:mainnet",
      addressSelector: createDefaultAddressSelector(),
      appIdentity: {
        name: "My app",
        uri: "https://myapp.io",
        icon: "relative/path/to/icon.png",
      },
      authorizationResultCache: createDefaultAuthorizationResultCache(),
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    }),
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
  ]
  const wallets: Wallet[] = adapters.map(a => ({ adapter: a, readyState: a.readyState }))
  // createEffect(() => {
  //   console.log({ wallets })
  // })
  return (
    <Router
      root={props => (
        <>
          <WalletProvider autoConnect={true} wallets={wallets}>
            <Nav />
            <Suspense>{props.children}</Suspense>
          </WalletProvider>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
