<script lang="ts">
  import "@solana-wallets/unified/index.css"

  import { initStore, type Cluster } from "@solana-wallets/core-1.0"
  import { onMount, setContext } from "svelte"
  import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase"
  import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger"
  import { TrezorWalletAdapter } from "@solana/wallet-adapter-trezor"

  export const env: Cluster | undefined = "mainnet-beta"
  export const autoConnect: boolean = true
  export const disconnectOnAccountChange: boolean = true

  const {
    $env: _env,
    $wallet: wallet,
    $wallets: wallets,
    $connecting: connecting,
    $walletsMap: walletsMap,
    initOnMount,
    signMessage,
    $isConnected: isConnected,
    $disconnecting: disconnecting,
    $connectedAccount: connectedAccount,
    sendTransaction,
    signTransaction,
    signAllTransactions,
  } = initStore({
    env,
    autoConnect,
    disconnectOnAccountChange,
    additionalWallets: [
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new TrezorWalletAdapter(),
    ],
  })

  onMount(() => {
    const cleanup = initOnMount()
    return cleanup
  })

  setContext("unified", {
    env: _env,
    wallet,
    connectedAccount,
    wallets,
    walletsMap,
    connecting,
    disconnecting,
    signMessage,
    signTransaction,
    signAllTransactions,
    sendTransaction,
  })

  onMount(() => {
    import("@solana-wallets/unified").then(r => r.loadCustomElements())
  })
</script>

<unified-wallet-modal />

<slot />
