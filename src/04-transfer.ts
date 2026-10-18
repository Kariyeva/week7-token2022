import { Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getAccount,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import * as fs from "node:fs";
import {
  connection,
  loadWallet,
  transactionLink,
} from "./common";

async function main() {
  const owner = loadWallet("wallet1.json");
  const recipient = loadWallet("wallet2.json").publicKey;
  const mint = loadWallet("mint.json").publicKey;

  const mintInfo = await getMint(
    connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const unit = 10n ** BigInt(mintInfo.decimals);
  const amount = 100n * unit;

  const source = getAssociatedTokenAddressSync(
    mint, owner.publicKey, false, TOKEN_2022_PROGRAM_ID
  );
  const destination = getAssociatedTokenAddressSync(
    mint, recipient, false, TOKEN_2022_PROGRAM_ID
  );

  const sourceInfo = await getAccount(
    connection, source, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const destinationExists = await connection.getAccountInfo(destination);
  const received = destinationExists
    ? (await getAccount(
        connection, destination, "confirmed", TOKEN_2022_PROGRAM_ID
      )).amount
    : 0n;

  if (sourceInfo.amount === 900n * unit && received === amount) {
    console.log("Перевод уже выполнен. Повторная отправка пропущена.");
  } else {
    if (
      mintInfo.supply !== 1000n * unit ||
      sourceInfo.amount !== 1000n * unit ||
      received !== 0n
    ) {
      throw new Error("Неожиданные балансы. Перевод остановлен.");
    }

    const transaction = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        owner.publicKey,
        destination,
        recipient,
        mint,
        TOKEN_2022_PROGRAM_ID
      ),
      createTransferCheckedInstruction(
        source,
        mint,
        destination,
        owner.publicKey,
        amount,
        mintInfo.decimals,
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
      "receipts/transfer.json",
      JSON.stringify({
        mint: mint.toBase58(),
        recipient: recipient.toBase58(),
        amount: "100",
        signature,
        explorer: transactionLink(signature),
      }, null, 2)
    );

    console.log("Переведено: 100 KRN");
    console.log("Транзакция:", transactionLink(signature));
  }

  const afterOwner = await getAccount(
    connection, source, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const afterRecipient = await getAccount(
    connection, destination, "confirmed", TOKEN_2022_PROGRAM_ID
  );

  console.log("Баланс владельца:", String(afterOwner.amount / unit), "KRN");
  console.log("Баланс получателя:", String(afterRecipient.amount / unit), "KRN");
  console.log("Счёт получателя:", destination.toBase58());

  if (
    afterOwner.amount !== 900n * unit ||
    afterRecipient.amount !== 100n * unit
  ) {
    throw new Error("Итоговые балансы требуют проверки");
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error("Ошибка:", error.message ?? error);
    process.exit(1);
  }
);
