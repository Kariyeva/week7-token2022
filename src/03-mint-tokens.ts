import { Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getAccount,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToCheckedInstruction,
} from "@solana/spl-token";
import * as fs from "node:fs";
import {
  connection,
  loadWallet,
  addressLink,
  transactionLink,
} from "./common";

async function main() {
  const owner = loadWallet("wallet1.json");
  const mint = loadWallet("mint.json").publicKey;

  const info = await getMint(
    connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const unit = 10n ** BigInt(info.decimals);
  const amount = 1000n * unit;

  if (!info.mintAuthority?.equals(owner.publicKey)) {
    throw new Error("Первый кошелёк не имеет права выпуска");
  }

  const tokenAccount = getAssociatedTokenAddressSync(
    mint, owner.publicKey, false, TOKEN_2022_PROGRAM_ID
  );

  if (info.supply === 0n) {
    const transaction = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        owner.publicKey,
        tokenAccount,
        owner.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
      ),
      createMintToCheckedInstruction(
        mint,
        tokenAccount,
        owner.publicKey,
        amount,
        info.decimals,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [owner],
      { commitment: "confirmed" }
    );

    fs.mkdirSync("receipts", { recursive: true });
    fs.writeFileSync(
      "receipts/mint-tokens.json",
      JSON.stringify({
        mint: mint.toBase58(),
        amount: "1000",
        signature,
        explorer: transactionLink(signature),
      }, null, 2)
    );

    console.log("Выпущено: 1000 KRN");
    console.log("Транзакция:", transactionLink(signature));
  } else if (info.supply === amount) {
    console.log("1000 KRN уже выпущены. Повторный выпуск пропущен.");
  } else {
    throw new Error("Объём выпуска отличается от ожидаемого. Нужна проверка.");
  }

  const account = await getAccount(
    connection, tokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const updatedMint = await getMint(
    connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID
  );

  console.log("Общий выпуск:", String(updatedMint.supply / unit), "KRN");
  console.log("Баланс владельца:", String(account.amount / unit), "KRN");
  console.log("Токеновый счёт:", tokenAccount.toBase58());
  console.log("Explorer счёта:", addressLink(tokenAccount.toBase58()));
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error("Ошибка:", error.message ?? error);
    process.exit(1);
  }
);
