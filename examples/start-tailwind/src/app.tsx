import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { createEffect, Suspense } from "solid-js"
import Nav from "~/components/Nav"
import "./app.css"
import { WalletProvider, Wallet } from "@solana-wallets-solid/core"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"

export default function App() {
  // const {
  // PhantomWalletAdapter,
  // SlopeWalletAdapter,
  // SolflareWalletAdapter,
  // SolletExtensionWalletAdapter,
  // TorusWalletAdapter,
  // } = await import('@solana/wallet-adapter-wallets');
  const adapters = [new PhantomWalletAdapter()]
  const wallets: Wallet[] = adapters.map(a => ({ adapter: a, readyState: a.readyState }))
  createEffect(() => {
    console.log({ wallets })
  })
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
