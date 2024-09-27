import {
  BaseMessageSignerWalletAdapter,
  EventEmitter,
  scopePollingDetectionStrategy,
  TransactionOrVersionedTransaction,
  WalletAccountError,
  WalletConnectionError,
  WalletDisconnectedError,
  WalletDisconnectionError,
  WalletError,
  WalletName,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletPublicKeyError,
  WalletReadyState,
  WalletSendTransactionError,
  WalletSignMessageError,
  WalletSignTransactionError,
} from "@solana/wallet-adapter-base"
import { address, Address, Signature, TransactionVersion } from "@solana/web3.js"

/**
 * The level of commitment desired when querying state
 * <pre>
 *   'processed': Query the most recent block which has reached 1 confirmation by the connected node
 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
 *   'finalized': Query the most recent block which has been finalized by the cluster
 * </pre>
 */
export type Commitment =
  | "processed"
  | "confirmed"
  | "finalized"
  | "recent" // Deprecated as of v1.5.5
  | "single" // Deprecated as of v1.5.5
  | "singleGossip" // Deprecated as of v1.5.5
  | "root" // Deprecated as of v1.5.5
  | "max" // Deprecated as of v1.5.5

/**
 * Options for sending transactions
 */
export type SendOptions = {
  /** disable transaction verification step */
  skipPreflight?: boolean
  /** preflight commitment level */
  preflightCommitment?: Commitment
  /** Maximum number of times for the RPC node to retry sending the transaction to the leader. */
  maxRetries?: number
  /** The minimum slot that the request can be evaluated at */
  minContextSlot?: number
}

export interface SendTransactionOptions extends SendOptions {
  signers?: unknown[]
}

interface CoinbaseWalletEvents {
  connect(...args: unknown[]): unknown
  disconnect(...args: unknown[]): unknown
}

interface CoinbaseWallet extends EventEmitter<CoinbaseWalletEvents> {
  publicKey?: any
  signTransaction<T extends TransactionOrVersionedTransaction<unknown>>(transaction: T): Promise<T>
  signAllTransactions<T extends TransactionOrVersionedTransaction<unknown>>(
    transactions: T[],
  ): Promise<T[]>
  signAndSendTransaction<T extends TransactionOrVersionedTransaction<unknown>>(
    transaction: T,
    options?: SendTransactionOptions,
  ): Promise<{ signature: Signature }>
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>
  connect(): Promise<void>
  disconnect(): Promise<void>
}

interface CoinbaseWindow extends Window {
  coinbaseSolana?: CoinbaseWallet
}

declare const window: CoinbaseWindow

export const CoinbaseWalletName = "Coinbase Wallet" as WalletName<"Coinbase Wallet">

export class CoinbaseWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = CoinbaseWalletName
  url =
    "https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad"
  icon =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8Y2lyY2xlIGN4PSI1MTIiIGN5PSI1MTIiIHI9IjUxMiIgZmlsbD0iIzAwNTJGRiIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE1MiA1MTJDMTUyIDcxMC44MjMgMzEzLjE3NyA4NzIgNTEyIDg3MkM3MTAuODIzIDg3MiA4NzIgNzEwLjgyMyA4NzIgNTEyQzg3MiAzMTMuMTc3IDcxMC44MjMgMTUyIDUxMiAxNTJDMzEzLjE3NyAxNTIgMTUyIDMxMy4xNzcgMTUyIDUxMlpNNDIwIDM5NkM0MDYuNzQ1IDM5NiAzOTYgNDA2Ljc0NSAzOTYgNDIwVjYwNEMzOTYgNjE3LjI1NSA0MDYuNzQ1IDYyOCA0MjAgNjI4SDYwNEM2MTcuMjU1IDYyOCA2MjggNjE3LjI1NSA2MjggNjA0VjQyMEM2MjggNDA2Ljc0NSA2MTcuMjU1IDM5NiA2MDQgMzk2SDQyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo="
  supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set(["legacy", 0])

  private _connecting: boolean
  private _wallet: CoinbaseWallet | null
  private _publicKey: Address | null
  private _readyState: WalletReadyState =
    typeof window === "undefined" || typeof document === "undefined"
      ? WalletReadyState.Unsupported
      : WalletReadyState.NotDetected

  constructor() {
    super()
    this._connecting = false
    this._wallet = null
    this._publicKey = null

    if (this._readyState !== WalletReadyState.Unsupported) {
      scopePollingDetectionStrategy(() => {
        if (window?.coinbaseSolana) {
          this._readyState = WalletReadyState.Installed
          this.emit("readyStateChange", this._readyState)
          return true
        }
        return false
      })
    }
  }
  get publicKey() {
    return this._publicKey
  }

  get connecting() {
    return this._connecting
  }

  get readyState() {
    return this._readyState
  }
  private _disconnected = () => {
    const wallet = this._wallet
    if (wallet) {
      wallet.off("disconnect", this._disconnected)

      this._wallet = null
      this._publicKey = null

      this.emit("error", new WalletDisconnectedError())
      this.emit("disconnect")
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return
      if (this._readyState !== WalletReadyState.Installed) throw new WalletNotReadyError()

      this._connecting = true

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const wallet = window.coinbaseSolana!

      try {
        await wallet.connect()
      } catch (error: any) {
        throw new WalletConnectionError(error?.message, error)
      }

      if (!wallet.publicKey) throw new WalletAccountError()

      let publicKey: Address
      try {
        publicKey = address(wallet.publicKey.toBase58() as string)
      } catch (error: any) {
        throw new WalletPublicKeyError(error?.message, error)
      }

      wallet.on("disconnect", this._disconnected)

      this._wallet = wallet
      this._publicKey = publicKey

      this.emit("connect", publicKey)
    } catch (error: any) {
      this.emit("error", error)
      throw error
    } finally {
      this._connecting = false
    }
  }

  async disconnect(): Promise<void> {
    const wallet = this._wallet
    if (wallet) {
      wallet.off("disconnect", this._disconnected)

      this._wallet = null
      this._publicKey = null

      try {
        await wallet.disconnect()
      } catch (error: any) {
        this.emit("error", new WalletDisconnectionError(error?.message, error))
      }
    }

    this.emit("disconnect")
  }

  async sendTransaction<T extends TransactionOrVersionedTransaction<"0">>(
    transaction: T,
    options: SendTransactionOptions = {},
  ): Promise<Signature> {
    try {
      const wallet = this._wallet
      if (!wallet) {
        throw new WalletNotConnectedError()
      }

      try {
        const { signers, ...sendOptions } = options

        // if (isVersionedTransaction(transaction)) {
        //   signers?.length && transaction.sign(signers)
        // } else {
        //   transaction = (await this.prepareTransaction(transaction, connection, sendOptions)) as T
        //   signers?.length && (transaction as Transaction).partialSign(...signers)
        // }

        sendOptions.preflightCommitment = sendOptions.preflightCommitment
        const { signature } = await wallet.signAndSendTransaction(transaction, sendOptions)
        return signature
      } catch (error: any) {
        if (error instanceof WalletError) {
          throw error
        }
        throw new WalletSendTransactionError(`${JSON.stringify(error)}`, error)
      }
    } catch (error: any) {
      this.emit("error", error)
      throw error
    }
  }
  async signTransaction<T extends TransactionOrVersionedTransaction<unknown>>(
    transaction: T,
  ): Promise<T> {
    try {
      const wallet = this._wallet
      if (!wallet) throw new WalletNotConnectedError()

      try {
        return ((await wallet.signTransaction(transaction)) as T) || transaction
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error)
      }
    } catch (error: any) {
      this.emit("error", error)
      throw error
    }
  }

  async signAllTransactions<T extends TransactionOrVersionedTransaction<unknown>>(
    transactions: T[],
  ): Promise<T[]> {
    try {
      const wallet = this._wallet
      if (!wallet) throw new WalletNotConnectedError()

      try {
        return ((await wallet.signAllTransactions(transactions)) as T[]) || transactions
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error)
      }
    } catch (error: any) {
      this.emit("error", error)
      throw error
    }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      const wallet = this._wallet
      if (!wallet) throw new WalletNotConnectedError()

      try {
        const { signature } = await wallet.signMessage(message)
        return signature
      } catch (error: any) {
        throw new WalletSignMessageError(error?.message, error)
      }
    } catch (error: any) {
      this.emit("error", error)
      throw error
    }
  }
}
