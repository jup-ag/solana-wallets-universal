import { useWallet } from "@solana-wallets/react-2.0"
import { useMemo } from "react"
import {
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
  pipe,
  lamports,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  address,
  signAndSendTransactionMessageWithSigners,
} from "@solana/web3.js"
import { getTransferSolInstruction } from "@solana-program/system"

const SIGN_ARBITRARY_MSG = new TextEncoder().encode("Hello World")
export const MAINNET_RPC_ENDPOINT = import.meta.env.DEV
  ? "https://jupiter-backend.rpcpool.com/d2c71a1c-824e-4e85-99cf-419fd967fda2"
  : "https://jupiter-frontend.rpcpool.com"
const DEVNET_RPC_ENDPOINT = "https://api.devnet.solana.com"

function WalletInteractionButtons() {
  const { connectedAccount, signMessage, getTransactionSendingSigner } = useWallet()
  const publicKey = useMemo(() => {
    return connectedAccount?.pubKey
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

  async function sendTxV2() {
    const transactionSendingSigner = getTransactionSendingSigner()
    if (!transactionSendingSigner) {
      console.error("sendTx: missing TransactionSendingSigner!")
      return
    }

    // Create an HTTP transport or any custom transport of your choice.
    const transport = createDefaultRpcTransport({ url: DEVNET_RPC_ENDPOINT })
    // Create an RPC client using that transport.
    const rpc = createSolanaRpcFromTransport(transport)
    const recentBlockhashRes = await rpc.getLatestBlockhash().send()
    const recentBlockhash = recentBlockhashRes.value
    const amount = lamports(10000000n)

    const message = pipe(
      createTransactionMessage({ version: 0 }),
      m => setTransactionMessageFeePayerSigner(transactionSendingSigner, m),
      m => setTransactionMessageLifetimeUsingBlockhash(recentBlockhash, m),
      m =>
        appendTransactionMessageInstruction(
          getTransferSolInstruction({
            amount,
            destination: address("Hm9YjuVadcekDPbLeCSFE83r1QLpS2ksmKk7Sn5BCpfL"),
            source: transactionSendingSigner,
          }),
          m,
        ),
    )

    try {
      const res = await signAndSendTransactionMessageWithSigners(message)
      alert(`sendtx success: ${res}`)
    } catch (e) {
      alert(`sendTxV2 failed: ${JSON.stringify(e)}`)
    }
  }

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
          <button className="w-fit rounded-lg bg-blue-300 px-3 py-1.5 text-lg" onClick={sendTxV2}>
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
