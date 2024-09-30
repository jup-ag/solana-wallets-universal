# React-2.0

React.js adapter for the `core-2.0` package

## Installation

```bash
npm install @your-repository-name/react-2.0
# or
yarn add @your-repository-name/react-2.0
# or
pnpm add @your-repository-name/react-2.0
```

## How to use it

```ts
import { WalletProvider } from "@your-repository-name/react-2.0"
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
  // @solana/web3.js v2.x.x should be added
  additionalWallets={[]}
>
  {props.children}
</WalletProvider>

// Example.tsx
import { useWallet } from "@your-repository-name/react-2.0"

const Example: React.FC = () => {
  const { connectedAccount, signMessage, sendTransaction } = useWallet()
  const publicKey = useMemo(() => {
    return connectedAccount?.pubKey
  }, [connectedAccount])
  return (
    <>
      ...
    </>
  )
}
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
