import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  connection,
  loadOrCreateWallet,
  addressLink,
} from "./common";

async function main() {
  const owner = loadOrCreateWallet("wallet1.json");
  const recipient = loadOrCreateWallet("wallet2.json");

  console.log("Сеть: Solana Devnet");
  console.log("Кошелёк 1 — владелец и плательщик:");
  console.log(owner.publicKey.toBase58());

  console.log("\nКошелёк 2 — получатель:");
  console.log(recipient.publicKey.toBase58());

  console.log(
    "\nExplorer кошелька 1:",
    addressLink(owner.publicKey.toBase58())
  );

  const balance = await connection.getBalance(
    owner.publicKey,
    "confirmed"
  );

  console.log(
    "\nБаланс кошелька 1:",
    balance / LAMPORTS_PER_SOL,
    "SOL"
  );
}

main().catch((error) => {
  console.error("Ошибка:", error.message ?? error);
  process.exitCode = 1;
});