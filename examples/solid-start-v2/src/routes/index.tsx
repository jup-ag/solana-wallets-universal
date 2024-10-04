import { A } from "@solidjs/router"
import { useWallet } from "@solana-wallets/solid-2.0"
import { getTransferSolInstruction } from "@solana-program/system"
import { Show, createMemo } from "solid-js"
import {
  address,
  appendTransactionMessageInstruction,
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
  createTransactionMessage,
  lamports,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
} from "@solana/web3.js"

const SIGN_ARBITRARY_MSG = new TextEncoder().encode("Hello World")
// const DEVNET_RPC_ENDPOINT = "https://api.devnet.solana.com"

export default function Home() {
  const MAINNET_RPC_ENDPOINT =
    "https://jupiter-backend.rpcpool.com/d2c71a1c-824e-4e85-99cf-419fd967fda2"

  const { signMessage, getTransactionSendingSigner, connectedAccount } = useWallet()
  const publicKey = createMemo<string | undefined>(() => {
    const accInfo = connectedAccount()
    if (!accInfo) {
      return
    }
    return accInfo.type === "standard"
      ? accInfo.info?.pubKey
      : (accInfo.info.publicKey?.toString() ?? undefined)
  })

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
    const transport = createDefaultRpcTransport({ url: MAINNET_RPC_ENDPOINT })
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
            destination: address("W4jj84Hs5Ts6BFK2nnmwbZYGGXzo5TdHdsLsakZqE5Y"),
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
    <main class="text-center mx-auto text-gray-700 p-4 space-y-8">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">Hello world!</h1>

      {/*

      <div class="flex flex-col gap-y-3 items-center justify-center">
        <For each={Object.values(wallets)}>
          {w => (
            <button
              class="rounded-lg px-3 py-1.5 text-lg bg-blue-300 w-fit"
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

      <div class="flex items-center justify-center w-full">
        <unified-wallet-modal-button />
      </div>

      <div class="flex flex-col gap-y-3 items-center justify-center">
        <Show when={publicKey() != null} fallback={""}>
          <code>{publicKey()!.toString()}</code>
        </Show>
        <Show when={publicKey()}>
          <button class="rounded-lg px-3 py-1.5 text-lg bg-blue-300 w-fit" onClick={signArbitary}>
            Sign message!
          </button>
          <button class="rounded-lg px-3 py-1.5 text-lg bg-blue-300 w-fit" onClick={sendTxV2}>
            Send tx!
          </button>
        </Show>
      </div>

      <p class="mt-8">
        Visit{" "}
        <a href="https://solidjs.com" target="_blank" class="text-sky-600 hover:underline">
          solidjs.com
        </a>{" "}
        to learn how to build Solid apps.
      </p>
      <p class="my-4">
        <span>Home</span>
        {" - "}
        <A href="/about" class="text-sky-600 hover:underline">
          About Page
        </A>{" "}
      </p>
    </main>
  )
}
