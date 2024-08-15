import {
  BaseSignerWalletAdapter,
  isIosAndRedirectable,
  isVersionedTransaction,
  WalletName,
  WalletNotConnectedError,
  WalletReadyState,
} from "@solana/wallet-adapter-base"
import { Keypair, Transaction, TransactionVersion, VersionedTransaction } from "@solana/web3.js"

export type THardcodedWalletStandardAdapter = {
  id: string
  name: WalletName
  url: string
  icon: string
  deepUrl?: (loc: Location) => string
}

export default class HardcodedWalletStandardAdapter extends BaseSignerWalletAdapter {
  name = "" as WalletName
  url = ""
  icon = ""
  deepUrl?: (loc: Location) => string
  supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set(["legacy", 0])

  /**
   * Storing a keypair locally like this is not safe because any application using this adapter could retrieve the
   * secret key, and because the keypair will be lost any time the wallet is disconnected or the window is refreshed.
   */
  private _keypair: Keypair | null = null
  public readyState: WalletReadyState = WalletReadyState.NotDetected

  constructor({ name, url, icon, deepUrl }: Omit<THardcodedWalletStandardAdapter, "id">) {
    super()
    this.name = name
    this.url = url
    this.icon = icon
    this.deepUrl = deepUrl

    if (this.deepUrl && isIosAndRedirectable()) {
      this.readyState = WalletReadyState.Loadable
    }
  }

  get connecting() {
    return false
  }

  get publicKey() {
    return this._keypair && this._keypair.publicKey
  }

  async connect(): Promise<void> {
    if (this.readyState === WalletReadyState.Loadable && this.deepUrl) {
      const url = this.deepUrl(window.location)
      window.location.href = url
      return
    }
    throw new WalletNotConnectedError()
  }

  async disconnect(): Promise<void> {
    this._keypair = null
    this.emit("disconnect")
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (!this._keypair) throw new WalletNotConnectedError()

    if (isVersionedTransaction(transaction)) {
      transaction.sign([this._keypair])
    } else {
      transaction.partialSign(this._keypair)
    }

    return transaction
  }
}
