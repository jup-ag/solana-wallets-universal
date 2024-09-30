<script lang="ts">
</script>

<!-- function WalletInteractionButtons() { -->
<!--   const { connectedAccount, signMessage, signTransaction, sendTransaction } = useWallet() -->
<!---->
<!--   const publicKey = useMemo<PublicKey | undefined>(() => { -->
<!--     if (!connectedAccount || !connectedAccount.info) { -->
<!--       return -->
<!--     } -->
<!--     return connectedAccount.type === "standard" -->
<!--       ? new PublicKey(connectedAccount.info.account.publicKey) -->
<!--       : (connectedAccount.info.publicKey ?? undefined) -->
<!--   }, [connectedAccount]) -->
<!---->
<!--   console.log({ publicKey }) -->
<!---->
<!--   async function signArbitary() { -->
<!--     try { -->
<!--       const res = await signMessage(SIGN_ARBITRARY_MSG) -->
<!--       console.log(res) -->
<!--       alert("Sign success! Check console logs for details.") -->
<!--     } catch (err) { -->
<!--       console.error(err) -->
<!--       alert((err as Error).message) -->
<!--     } -->
<!--   } -->
<!---->
<!--   const sendTxV1 = useCallback(async () => { -->
<!--     const APPEAL_WALLET_PUBKEY = new PublicKey("BJm85nAD9ZbBpnTFUfuDHmDhQ2T3QK554ppSVPRY6yC5") -->
<!--     if (!publicKey) { -->
<!--       console.error("cannot sign tx, no pub key: ", { publicKey }) -->
<!--       return -->
<!--     } -->
<!--     const lamportsToSend = 0.1 * LAMPORTS_PER_SOL -->
<!--     const transaction = new Transaction().add( -->
<!--       SystemProgram.transfer({ -->
<!--         fromPubkey: publicKey, -->
<!--         toPubkey: APPEAL_WALLET_PUBKEY, -->
<!--         lamports: lamportsToSend, -->
<!--       }), -->
<!--     ) -->
<!---->
<!--     const connection = new Connection(DEVNET_RPC_ENDPOINT, "confirmed") -->
<!--     const latestHash = await connection.getLatestBlockhash("finalized") -->
<!--     if (transaction instanceof Transaction) { -->
<!--       transaction.recentBlockhash = latestHash.blockhash -->
<!--       transaction.feePayer = publicKey -->
<!--     } -->
<!--     const res = await sendTransaction(transaction, connection, {}) -->
<!--     console.log("successful tx: ", { res }) -->
<!--   }, [publicKey]) -->
<!---->
<!--   return ( -->
<!--     <div className="flex flex-col items-center justify-center gap-y-3"> -->
<!--       {publicKey != null ? ( -->
<!--         <> -->
<!--           <button -->
<!--             className="w-fit rounded-lg bg-blue-300 px-3 py-1.5 text-lg" -->
<!--             onClick={signArbitary} -->
<!--           > -->
<!--             Sign message! -->
<!--           </button> -->
<!--           <button className="w-fit rounded-lg bg-blue-300 px-3 py-1.5 text-lg" onClick={sendTxV1}> -->
<!--             Send tx! -->
<!--           </button> -->
<!--         </> -->
<!--       ) : null} -->
<!--     </div> -->
<!--   ) -->
<!-- } -->
