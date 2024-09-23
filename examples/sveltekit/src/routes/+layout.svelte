<script lang="ts">
  import { initStore } from "@solana-wallets-solid/core"
  import { onMount, setContext } from "svelte"
  import "@solana-wallets-solid/unified/index.css"

  const {
    $env: env,
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
  } = initStore({ autoConnect: true, disconnectOnAccountChange: true })

  onMount(() => {
    const cleanup = initOnMount()
    return cleanup
  })

  setContext("unified", {
    env,
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
