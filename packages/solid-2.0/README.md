<a href="https://github.com/your-author-name/your-repository-name/tree/main/packages/hello#readme">
<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=your-repository-name&background=tiles&project=Hello" alt="your-repository-name Hello">
</p>

# Solid-2.0

Solid.js adapter for the `core-2.0` package

## Installation

```bash
npm install @your-repository-name/solid-2.0
# or
yarn add @your-repository-name/solid-2.0
# or
pnpm add @your-repository-name/solid-2.0
```

## How to use it

```ts
import { WalletProvider } from "@your-repository-name/solid-2.0"

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
import { useWallet } from "@your-repository-name/solid-2.0"

const Example: Component = () => {
  const { connectedAccount, signMessage, getTransactionSendingSigner } = useWallet()
  const publicKey = createMemo<string | undefined>(() => {
    const accInfo = connectedAccount()
    if (!accInfo) {
      return
    }
    return accInfo.type === "standard"
      ? accInfo.info?.pubKey
      : (accInfo.info.publicKey?.toString() ?? undefined)
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
