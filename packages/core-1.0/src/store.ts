import {
  initStore as _initStore,
  generateWalletMap,
  SendTransactionOptions,
  StoreProps,
  WalletInfo,
  convertToWalletStandardCluster,
} from "@solana-wallets/core"
import {
  SolanaSignTransaction,
  SolanaSignTransactionInput,
  SolanaSignAndSendTransaction,
  SolanaSignAndSendTransactionInput,
} from "@solana/wallet-standard-features"
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"

import { getMobileWallet } from "./mwa"

/**
 * Sets up all wallet related data, event listeners, etc
 * required for connecting/disconnecting to wallets
 *
 * This function should be run within a framework-specific
 * context when mounted on client side e.g.
 *
 * ```ts
 * // solidjs
 * onMount(() => {
 *   const cleanup = initStore();
 *   onCleanup(() => {
 *     cleanup();
 *   })
 * })
 *
 * // reactjs
 * useEffect(() => {
 *   const cleanup = initStore();
 *   return () => {
 *     cleanup();
 *   }
 * }, [])
 * ```
 */
export function initStore({
  env,
  disconnectOnAccountChange,
  autoConnect,
  additionalWallets = [],
}: StoreProps) {
  const {
    $connectedAccount,
    $wallet,
    $wallets,
    $walletsMap,
    $env,
    $connecting,
    signMessage,
    initOnMount: _initOnMount,
    $isConnected,
    $disconnecting,
  } = _initStore({
    env,
    disconnectOnAccountChange,
    additionalWallets,
    autoConnect,
  })

  /**
   * Sign single transaction
   *
   * Only compatible with `@solana/web3.js@v1`
   */
  async function signTransaction(tx: Transaction | VersionedTransaction) {
    const connectedAccount = $connectedAccount.get()
    const walletInfo = $wallet.get()
    if (!connectedAccount || !walletInfo) {
      throw new Error("signTransaction failed, missing adapter/public key!")
    }

    if (connectedAccount.type === "custom") {
      const res = await connectedAccount.info.signTransaction(tx)
      return res
    }

    if (walletInfo.type !== "standard" || connectedAccount.type !== "standard") {
      throw new Error("solana:signTransaction NOT found since wallet is not standard wallet")
    }

    const wallet = walletInfo.wallet
    if (!(SolanaSignTransaction in wallet.features)) {
      throw new Error("solana:signTransaction NOT found in standard wallet features")
    }

    const acc = connectedAccount.info?.account
    if (!acc) {
      throw new Error("solana:signTransaction account NOT found in connected standard wallet")
    }

    const feature = wallet.features[SolanaSignTransaction]
    const txBytes = tx.serialize({ verifySignatures: false })
    const input: SolanaSignTransactionInput = {
      account: acc,
      transaction: txBytes,
    }

    const res = await feature.signTransaction(input)
    if (res.length === 0 || !res[0]) {
      throw new Error("failed to sign tx, missing sign tx output")
    }
    return res[0].signedTransaction
  }

  /**
   * Sign multiple transactions
   *
   * Only compatible with `@solana/web3.js@v1`
   */
  async function signAllTransactions(txs: (Transaction | VersionedTransaction)[]) {
    const connectedAccount = $connectedAccount.get()
    const walletInfo = $wallet.get()
    if (!connectedAccount || !walletInfo) {
      throw new Error("signAllTransactions failed, missing adapter/public key!")
    }

    if (connectedAccount.type === "custom") {
      const res = await connectedAccount.info.signAllTransactions(txs)
      return res
    }

    if (walletInfo.type !== "standard" || connectedAccount.type !== "standard") {
      throw new Error("solana:signTransaction NOT found since wallet is not standard wallet")
    }

    const wallet = walletInfo.wallet
    if (!(SolanaSignTransaction in wallet.features)) {
      throw new Error("solana:signTransaction NOT found in standard wallet features")
    }

    const acc = connectedAccount.info?.account
    if (!acc) {
      throw new Error("solana:signTransaction account NOT found in connected standard wallet")
    }

    const feature = wallet.features[SolanaSignTransaction]
    const inputs: SolanaSignTransactionInput[] = txs.map(tx => ({
      account: acc,
      transaction: tx.serialize({ verifySignatures: false }),
    }))
    const res = await feature.signTransaction(...inputs)
    if (res.length === 0 || !res[0]) {
      throw new Error("solana:signTransaction failed, missing sign all txs output")
    }
    return res[0].signedTransaction
  }

  /*
   * Send transactions via `@solana/web3` v1 package
   */
  async function sendTransaction(
    tx: Transaction | VersionedTransaction,
    connection: Connection,
    options: SendTransactionOptions,
  ) {
    const connectedAccount = $connectedAccount.get()
    const walletInfo = $wallet.get()

    if (!connectedAccount || !walletInfo) {
      throw new Error("sendTransaction failed: missing adapter / public key!")
    }

    if (connectedAccount.type === "custom") {
      try {
        const res = await connectedAccount.info.sendTransaction(tx, connection, {
          signers: [],
          ...options,
        })
        return res
      } catch (e) {
        alert(`sendTransaction: custom wallet error: ${JSON.stringify(e)}`)
      }
    }

    if (walletInfo.type === "mwa" && connectedAccount.type === "mwa") {
      try {
        alert(`${JSON.stringify(connectedAccount.info?.account)}`)
        const res = await walletInfo.wallet.sendTransaction(tx, connection, options)
        alert(`walletInfo.wallet.sendTransaction: ${JSON.stringify(res)}`)

        return res
        // const res = await acc.features[SolanaSignAndSendTransaction](tx, connection, {
        //   signers: [],
        //   ...options,
        // })
        // return res
      } catch (e) {
        alert(`sendTransaction: custom wallet error: ${JSON.stringify(e)}`)
      }
    }

    if (walletInfo.type !== "standard" || connectedAccount.type !== "standard") {
      throw new Error("solana:signAndSendTransaction NOT found since wallet is not standard wallet")
    }

    const wallet = walletInfo.wallet
    if (!(SolanaSignAndSendTransaction in wallet.features)) {
      throw new Error("solana:signAndSendTransaction NOT found in standard wallet features")
    }

    const acc = connectedAccount.info?.account
    if (!acc) {
      throw new Error(
        "solana:signAndSendTransaction account NOT found in connected standard wallet",
      )
    }

    const txBytes = tx.serialize({ verifySignatures: false })
    const network = convertToWalletStandardCluster($env.get())
    const input: SolanaSignAndSendTransactionInput = {
      account: acc,
      transaction: txBytes,
      chain: `solana:${network}`,
    }

    const feature = wallet.features[SolanaSignAndSendTransaction]
    const res = await feature.signAndSendTransaction(input)

    if (res.length === 0 || !res[0]) {
      throw new Error("Missing tx output from signAndSendTx from connected standard wallet!")
    }
    return res[0].signature
  }

  function initOnMount() {
    const cleanup = _initOnMount()
    const wallets = $wallets.get()
    const standardWallets = wallets.filter(w => w.type === "standard").map(w => w.wallet)
    const mobile = getMobileWallet(standardWallets, $env.get())
    if (mobile) {
      const mobileInfo: WalletInfo = {
        type: "mwa",
        wallet: mobile as any,
      }
      alert(`mwa wallet info: ${JSON.stringify(mobileInfo)}`)
      $walletsMap.set(generateWalletMap([...$wallets.get(), mobileInfo]))
    }
    return cleanup
  }

  return {
    $wallets,
    $walletsMap,
    $connectedAccount,
    $isConnected,
    $wallet,

    $env,
    $connecting,
    $disconnecting,

    initOnMount,

    signMessage,
    signTransaction,
    signAllTransactions,
    sendTransaction,
  }
}

// re-export types
export type Store = ReturnType<typeof initStore>
export * from "@solana-wallets/core"
export type { Connection, Transaction, VersionedTransaction }

/** Add ready state change listeners for all wallets,
 * wallet state should update regardless of whether
 * any wallet is currently connected
 */
// function onReadyStateChange(this: Adapter, readyState: WalletReadyState) {
//   // setReady(_adapter.readyState)
//   // When the wallets change, start to listen for changes to their `readyState`
// const newWallets = wallets.get().filter((w) => w.adapter.name === this.name )
//   setWallets(ws => ws.adapter.name === this.name, { adapter: this, readyState })
// }

/**
 * Add handlers for updating wallet ready states
 */
// export function onMountUpdateWalletsReadyStateChange() {
//   wallets.get().forEach(({ adapter }) => {
//     adapter.on("readyStateChange", onReadyStateChange, adapter)
//   })
//   onCleanup(() => {
//     wallets.forEach(({ adapter }) => {
//       adapter.off("readyStateChange", onReadyStateChange, adapter)
//     })
//   })
// }
