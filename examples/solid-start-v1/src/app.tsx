import "@solana-wallets/unified/index.css"
import "./app.css"

import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense } from "solid-js"
import { WalletProvider } from "@solana-wallets/solid-1.0"
import { UnifiedWalletProviderProps, UnifiedWalletButtonProps } from "@solana-wallets/unified"
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase"
import { TrezorWalletAdapter } from "@solana/wallet-adapter-trezor"
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger"

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
  return (
    <Router
      root={props => (
        <>
          <Nav />
          <Suspense>
            <WalletProvider
              autoConnect={true}
              disconnectOnAccountChange={true}
              localStorageKey="unified:wallet-storage-key"
              env={"mainnet-beta"}
              additionalWallets={[
                new CoinbaseWalletAdapter(),
                new TrezorWalletAdapter({ connectUrl: "https://connect.trezor.io/9/" }),
                new LedgerWalletAdapter(),
              ]}
            >
              {props.children}
            </WalletProvider>
          </Suspense>
          <unified-wallet-modal />
        </>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
