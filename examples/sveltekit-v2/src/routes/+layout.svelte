<script lang="ts">
  import "@solana-wallets/unified/index.css"

  import { initStore, type Cluster } from "@solana-wallets/core-2.0"
  import { onMount, setContext } from "svelte"

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
    getTransactionSendingSigner,
  })

  onMount(() => {
    import("@solana-wallets/unified").then(r => r.loadCustomElements())
  })
</script>

<unified-wallet-modal />

<slot />
