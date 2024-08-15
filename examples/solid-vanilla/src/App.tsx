import "@solana-wallets-solid/unified/index.css"
import "./index.css"

import type { Component } from "solid-js"
import { UnifiedWalletButton, UnifiedWalletProvider, Wallet } from "@solana-wallets-solid/unified"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare"
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
} from "@solana-mobile/wallet-adapter-mobile"

const App: Component = () => {
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
  return (
    <UnifiedWalletProvider
      locale={"en"}
      autoConnect={true}
      wallets={wallets}
      config={{
        env: "mainnet-beta",
        theme: "jupiter",
        metadata: {
          name: "UnifiedWallet",
          description: "UnifiedWallet",
          url: "https://jup.ag",
          iconUrls: ["https://jup.ag/favicon.ico"],
        },
        walletlistExplanation: {
          href: "https://station.jup.ag/docs/additional-topics/wallet-list",
        },
      }}
    >
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          height: "100vh",
        }}
      >
        <UnifiedWalletButton />
      </div>
    </UnifiedWalletProvider>
  )
}

export default App
