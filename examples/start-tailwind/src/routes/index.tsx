import { A } from "@solidjs/router"

import { useWallet } from "@solana-wallets-solid/solid"
import { Show, createMemo } from "solid-js"
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js"
// import {
//   Connection,
//   LAMPORTS_PER_SOL,
//   PublicKey,
//   SystemProgram,
//   Transaction,
// } from "@solana/web3.js"

const SIGN_ARBITRARY_MSG = new TextEncoder().encode("Hello World")
export const MAINNET_RPC_ENDPOINT = import.meta.env.DEV
  ? "https://jupiter-backend.rpcpool.com/d2c71a1c-824e-4e85-99cf-419fd967fda2"
  : "https://jupiter-frontend.rpcpool.com"
const DEVNET_RPC_ENDPOINT = "https://api.devnet.solana.com"

export default function Home() {
  const { signMessage, signTransaction, signAllTransactions, sendTransaction, connectedAccount } =
    useWallet()
  const publicKey = createMemo(() => connectedAccount()?.pubKey)

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

  // async function sendTxV2() {
  //
  // // Create an HTTP transport or any custom transport of your choice.
  // const transport = createDefaultRpcTransport({ url: "https://api.devnet.solana.com" })
  //
  // // Create an RPC client using that transport.
  // const rpc = createSolanaRpcFromTransport(transport)
  //
  //   // Send a request.
  //   const recentBlockhashRes = await rpc.getLatestBlockhash().send()
  //   const recentBlockhash = recentBlockhashRes.value
  //
  //   const pubKey = publicKey()
  //   if (!pubKey) {
  //     console.error("cannot send tx without logging in !")
  //     return
  //   }
  //
  //   // Create the transfer SOL instruction by passing the signer as the source.
  //   const instruction = getTransferSolInstruction({
  //     amount: 1n,
  //     destination: address(pubKey),
  //     source: { address: address(pubKey)},
  //   })
  //
  //   const transactionMessage = pipe(
  //     createTransactionMessage({ version: 0 }),
  //     tx => setTransactionMessageFeePayer(address(pubKey), tx),
  //     tx => setTransactionMessageLifetimeUsingBlockhash(recentBlockhash, tx),
  //   )
  //
  //   console.log({ transactionMessage })
  //
  //   const compiled = compileTransaction(transactionMessage)
  //
  //   console.log({ compiled })
  //   // const decoder = getBytesDecoder();
  //   // decoder.decode
  //   // compiled.messageBytes
  //   // const bytes = new Uint8Array(compiled.messageBytes)
  //
  //   console.log({ bytes: compiled.messageBytes })
  //   const sig = await signTransaction(compiled.messageBytes as unknown as Uint8Array)
  //
  //   console.log({ sig })
  //
  //
  // }

  async function sendTxV1() {
    const APPEAL_WALLET_PUBKEY = new PublicKey("Hm9YjuVadcekDPbLeCSFE83r1QLpS2ksmKk7Sn5BCpfL")
    const rawPubKey = publicKey()
    if (!rawPubKey) {
      console.error("cannot sign tx, no pub key: ", { rawPubKey })
      return
    }
    const pubKey = new PublicKey(rawPubKey)
    const lamportsToSend = 0.1 * LAMPORTS_PER_SOL
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: pubKey,
        toPubkey: APPEAL_WALLET_PUBKEY,
        lamports: lamportsToSend,
      }),
    )

    const connection = new Connection(DEVNET_RPC_ENDPOINT, "confirmed")
    const latestHash = await connection.getLatestBlockhash("finalized")
    if (transaction instanceof Transaction) {
      transaction.recentBlockhash = latestHash.blockhash
      transaction.feePayer = pubKey
    }
    const tx = new Uint8Array(
      transaction.serialize({ verifySignatures: false, requireAllSignatures: false }),
    )
    const res = await sendTransaction(tx)
    console.log("successful tx: ", { res })
  }

  // createEffect(() => {
  //   console.log({ showmodal: showModal() })
  // })

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
          <button class="rounded-lg px-3 py-1.5 text-lg bg-blue-300 w-fit" onClick={sendTxV1}>
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
