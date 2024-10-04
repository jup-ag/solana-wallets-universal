import { useWallet } from "@solana-wallets/react-1.0"
import { useCallback, useMemo } from "react"
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js"

const SIGN_ARBITRARY_MSG = new TextEncoder().encode("Hello World")
export const MAINNET_RPC_ENDPOINT = import.meta.env.DEV
  ? "https://jupiter-backend.rpcpool.com/d2c71a1c-824e-4e85-99cf-419fd967fda2"
  : "https://jupiter-frontend.rpcpool.com"
// const DEVNET_RPC_ENDPOINT = "https://api.devnet.solana.com"

function WalletInteractionButtons() {
  const { connectedAccount, signMessage, sendTransaction } = useWallet()

  const publicKey = useMemo<PublicKey | undefined>(() => {
    if (!connectedAccount || !connectedAccount.info) {
      return
    }
    return connectedAccount.type === "standard"
      ? new PublicKey(connectedAccount.info.account.publicKey)
      : (connectedAccount.info.publicKey ?? undefined)
  }, [connectedAccount])

  console.log({ publicKey })

  async function signArbitary() {
    try {
      const res = await signMessage(SIGN_ARBITRARY_MSG)
      console.log(res)
      alert("Sign success! Check console logs for details.")
    } catch (err) {
      console.error(err)
      alert((err as Error).message)
    }
  }

  const sendTxV1 = useCallback(async () => {
    const APPEAL_WALLET_PUBKEY = new PublicKey("Hm9YjuVadcekDPbLeCSFE83r1QLpS2ksmKk7Sn5BCpfL")
    if (!publicKey) {
      console.error("cannot sign tx, no pub key: ", { publicKey })
      return
    }
    const lamportsToSend = 0.01 * LAMPORTS_PER_SOL
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: APPEAL_WALLET_PUBKEY,
        lamports: lamportsToSend,
      }),
    )

    const connection = new Connection(MAINNET_RPC_ENDPOINT, "confirmed")
    const latestHash = await connection.getLatestBlockhash("finalized")
    if (transaction instanceof Transaction) {
      transaction.recentBlockhash = latestHash.blockhash
      transaction.feePayer = publicKey
    }
    const res = await sendTransaction(transaction, connection, {})
    console.log("successful tx: ", { res })
  }, [publicKey])

  return (
    <div className="flex flex-col items-center justify-center gap-y-3">
      {publicKey != null ? (
        <>
          <button
            className="w-fit rounded-lg bg-blue-300 px-3 py-1.5 text-lg"
            onClick={signArbitary}
          >
            Sign message!
          </button>
          <button className="w-fit rounded-lg bg-blue-300 px-3 py-1.5 text-lg" onClick={sendTxV1}>
            Send tx!
          </button>
        </>
      ) : null}
    </div>
  )
}

export default function Index() {
  return (
    <main className="mx-auto space-y-8 p-4 text-center text-gray-700">
      <h1 className="max-6-xs my-16 text-6xl font-thin uppercase text-sky-700">Hello world!</h1>

      {/*

      <div className="flex flex-col gap-y-3 items-center justify-center">
        <For each={Object.values(wallets)}>
          {w => (
            <button
              className="rounded-lg px-3 py-1.5 text-lg bg-blue-300 w-fit"
              onClick={async () => {
                const _adapter = wallet()
                if (!_adapter) {
                  await select(w.adapter.name)
                } else if (_adapter.name === w.adapter.name) {
                  // await disconnect()
                }
              }}
            >
              <Show
                when={!wallet() || name() !== w.adapter.name}
                fallback={`disconnect from ${w.adapter.name}`}
              >
                connect to {w.adapter.name}
              </Show>
            </button>
          )}
        </For>
      </div>

				*/}

      <div className="flex w-full items-center justify-center">
        <unified-wallet-modal-button />
      </div>

      <WalletInteractionButtons />

      <p className="mt-8">
        Visit{" "}
        <a href="https://solidjs.com" target="_blank" className="text-sky-600 hover:underline">
          solidjs.com
        </a>{" "}
        to learn how to build Solid apps.
      </p>
      <p className="my-4">
        <span>Home</span>
        {" - "}
        <a href="/about" className="text-sky-600 hover:underline">
          About Page
        </a>{" "}
      </p>
    </main>
  )
}
