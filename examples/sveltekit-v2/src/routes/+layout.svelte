<script lang="ts">
  import { initStore, type Cluster } from "@solana-wallets-solid/core-2.0"
  import { onMount, setContext } from "svelte"
  import "@solana-wallets-solid/unified/index.css"

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
    sendTransactionV1,
    signTransactionV1,
    signAllTransactionsV1,
    getTransactionSendingSigner,
  } = initStore({ env, autoConnect, disconnectOnAccountChange })

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
    signTransactionV1,
    signAllTransactionsV1,
    sendTransactionV1,
    getTransactionSendingSigner,
  })

  onMount(() => {
    import("@solana-wallets-solid/unified").then(r => r.loadCustomElements())
  })
</script>

<unified-wallet-modal />

<slot />
