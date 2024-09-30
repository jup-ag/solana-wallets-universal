<a href="https://github.com/your-author-name/your-repository-name/tree/main/packages/hello#readme">
<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=your-repository-name&background=tiles&project=Hello" alt="your-repository-name Hello">
</p>

# Solid-1.0

Solid.js adapter for the `core-1.0` package

## Installation

```bash
npm install @your-repository-name/solid-1.0
# or
yarn add @your-repository-name/solid-1.0
# or
pnpm add @your-repository-name/solid-1.0
```

## How to use it

```ts
import { WalletProvider } from "@your-repository-name/solid-1.0"
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase"
import { TrezorWalletAdapter } from "@solana/wallet-adapter-trezor"
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger"

// App.tsx
<WalletProvider
  autoConnect={true}
  disconnectOnAccountChange={true}
  localStorageKey="unified:wallet-storage-key"
  env={"devnet"}
  // NOTE: only wallet adapters that use
  // @solana/web3.js v1.x.x should be added
  additionalWallets={[
    new CoinbaseWalletAdapter(),
    new TrezorWalletAdapter({ connectUrl: "https://connect.trezor.io/9/" }),
    new LedgerWalletAdapter(),
  ]}
>
  {props.children}
</WalletProvider>

// Example.tsx
import { useWallet } from "@your-repository-name/solid-1.0"

const Example: Component = () => {
  const { connectedAccount, signMessage, sendTransaction } = useWallet()
  const publicKey = createMemo<PublicKey | undefined>(() => {
    const accInfo = connectedAccount()
    if (!accInfo || !accInfo.info) {
      return
    }
    return accInfo.type === "standard"
      ? new PublicKey(accInfo.info.account.publicKey)
      : (accInfo.info.publicKey ?? undefined)
  })
  return (
    <>
      ...
    </>
  )
}
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
