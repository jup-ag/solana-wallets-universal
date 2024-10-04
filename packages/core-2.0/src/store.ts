import {
  initStore as _initStore,
  StoreProps,
  convertToWalletStandardCluster,
} from "@solana-wallets/core"
import {
  SolanaSignAndSendTransaction,
  SolanaSignAndSendTransactionInput,
} from "@solana/wallet-standard-features"
import {
  address,
  getTransactionEncoder,
  SignatureBytes,
  TransactionSendingSigner,
} from "@solana/web3.js"

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
    initOnMount,
    signMessage,
    $isConnected,
    $disconnecting,
  } = _initStore({ env, disconnectOnAccountChange, autoConnect, additionalWallets })

  /**
   * Get a `TransactionSendingSigner` for signing transactions
   *
   * Only compatible with `@solana/web3.js@v2`
   *
   * @see https://github.com/solana-labs/solana-web3.js/blob/855c4e0998c58f500c7c950d51017fdccf8b61d6/packages/react/src/useSignAndSendTransaction.ts
   */
  function getTransactionSendingSigner(): TransactionSendingSigner | undefined {
    const connectedAccount = $connectedAccount.get()
    if (!connectedAccount || !connectedAccount.info) {
      return
    }
    const add =
      connectedAccount.type === "standard" || connectedAccount.type === "mwa"
        ? connectedAccount.info.pubKey
        : connectedAccount.info.publicKey
    if (!add) {
      return
    }

    const transactionSendingSigner: TransactionSendingSigner = {
      address: address(add),
      signAndSendTransactions: async (txs, config = {}) => {
        const { abortSignal, minContextSlot } = config
        abortSignal?.throwIfAborted()

        const walletInfo = $wallet.get()
        if (!walletInfo) {
          throw new Error("solana:signAndSendTransaction wallet not connected!")
        }

        if (walletInfo.type === "ios-webview") {
          throw new Error(
            "getTransactionSendingSigner NOT found since wallet is not standard wallet",
          )
        }

        const [tx] = txs
        if (txs.length === 0) {
          throw new Error("No transactions found for signing")
        }
        if (!tx) {
          throw new Error("No transactions found for signing")
        }

        if (walletInfo.type === "custom" && connectedAccount.type === "custom") {
          // const acc = connectedAccount.account
          // const transactionEncoder = getTransactionEncoder()
          // const wireTxBytes = transactionEncoder.encode(tx)
          // const input: SolanaSignAndSendTransactionInput = {
          //   account: acc,
          //   transaction: wireTxBytes as Uint8Array,
          //   chain: `solana:${$env.get()}`,
          //   ...(minContextSlot != null
          //     ? {
          //         options: {
          //           minContextSlot: Number(minContextSlot),
          //         },
          //       }
          //     : null),
          // }
          alert(`signAndSend not supported by custom wallet!`)
          // try {
          //   const res = await walletInfo.wallet.sign(tx)
          //   return [new TextEncoder().encode(res) as SignatureBytes]
          // } catch (e) {
          //   alert(`signAndSendTrasactions:coinbase: error occurred: ${JSON.stringify(e)}`)
          // }
        }

        if (walletInfo.type !== "standard" || connectedAccount.type !== "standard") {
          throw new Error("getTransactionSendingSigner NOT found in standard wallet features")
        }

        const wallet = walletInfo.wallet
        if (!(SolanaSignAndSendTransaction in wallet.features)) {
          throw new Error("getTransactionSendingSigner NOT found in standard wallet features")
        }

        const acc = connectedAccount.info
        if (!acc) {
          throw new Error("getTransactionSendingSigner NOT found in standard wallet features")
        }

        const transactionEncoder = getTransactionEncoder()
        const wireTxBytes = transactionEncoder.encode(tx)
        const network = convertToWalletStandardCluster($env.get())
        const input: SolanaSignAndSendTransactionInput = {
          account: acc?.account,
          transaction: wireTxBytes as Uint8Array,
          chain: `solana:${network}`,
          ...(minContextSlot != null
            ? {
                options: {
                  minContextSlot: Number(minContextSlot),
                },
              }
            : null),
        }
        const feature = wallet.features[SolanaSignAndSendTransaction]
        const res = await feature.signAndSendTransaction(input)
        return res.map(s => s.signature as SignatureBytes)
      },
    }

    return transactionSendingSigner
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
    getTransactionSendingSigner,
  }
}

// re-export types
export type Store = ReturnType<typeof initStore>
export * from "@solana-wallets/core"
// export * from "./coinbase"

// function getMobileWallet(wallets: WalletAdapterCompatibleStandardWallet[]) {
//   /**
//    * Return null if Mobile wallet adapter is already in the list or if ReadyState is Installed.
//    *
//    * There are only two ways a browser extension adapter should be able to reach `Installed` status:
//    *   1. Its browser extension is installed.
//    *   2. The app is running on a mobile wallet's in-app browser.
//    * In either case, we consider the environment to be desktop-like and not 'mobile'.
//    */
//   if (
//     wallets.some(
//       ({ name,  }) =>
//         name === SolanaMobileWalletAdapterWalletName,
//     )
//   ) {
//     return null
//   }
//
//   const ua = globalThis.navigator?.userAgent ?? null
//
//   const getUriForAppIdentity = () => {
//     const { location } = globalThis
//     if (location) {
//       return `${location.protocol}//${location.host}`
//     }
//   }
//
//   /**
//    * Return Mobile Wallet Adapter object if we are running
//    * on a device that supports MWA like Android
//    * and we are *not* running in a WebView.
//    */
//   if (ua && isOnAndroid(ua) && !isInWebView(ua)) {
//     const mobileWalletAdapter = new SolanaMobileWalletAdapter({
//       addressSelector: createDefaultAddressSelector(),
//       appIdentity: {
//         uri: getUriForAppIdentity(),
//       },
//       authorizationResultCache: createDefaultAuthorizationResultCache(),
//       chain: $env.get(),
//       onWalletNotFound: createDefaultWalletNotFoundHandler(),
//     })
//
//     console.log(
//       "adding new solana mobile wallet adapter! (mobile + android + not webview): ",
//       mobileWalletAdapter,
//     )
//     return mobileWalletAdapter
//   }
// }

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
