import {
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getTokenMetadata,
} from "@solana/spl-token";
import {
  createUpdateFieldInstruction,
  pack,
} from "@solana/spl-token-metadata";
import * as fs from "node:fs";
import { connection, loadWallet, transactionLink } from "./common";

const uri =
  "https://raw.githubusercontent.com/Kariyeva/week7-token2022/main/metadata/token.json";

async function main() {
  const owner = loadWallet("wallet1.json");
  const mint = loadWallet("mint.json").publicKey;

  const response = await fetch(uri, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`JSON недоступен: HTTP ${response.status}`);
  }
  const json = await response.json();
  if (json.name !== "Karina Token" || json.symbol !== "KRN") {
    throw new Error("Название или символ в JSON не совпадают");
  }

  const metadata = await getTokenMetadata(
    connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const account = await connection.getAccountInfo(mint, "confirmed");

  if (!metadata || !account) {
    throw new Error("Mint или метаданные не найдены");
  }
  if (!metadata.updateAuthority?.equals(owner.publicKey)) {
    throw new Error("Нет права изменять метаданные");
  }

  if (metadata.uri !== uri) {
    const updated = { ...metadata, uri };
    const newSize =
      account.data.length + pack(updated).length - pack(metadata).length;
    const rent = await connection.getMinimumBalanceForRentExemption(newSize);

    const transaction = new Transaction();
    if (rent > account.lamports) {
      transaction.add(SystemProgram.transfer({
        fromPubkey: owner.publicKey,
        toPubkey: mint,
        lamports: rent - account.lamports,
      }));
    }

    transaction.add(createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority: owner.publicKey,
      field: "uri",
      value: uri,
    }));

    const signature = await sendAndConfirmTransaction(
      connection, transaction, [owner], { commitment: "confirmed" }
    );

    fs.mkdirSync("receipts", { recursive: true });
    fs.writeFileSync(
      "receipts/metadata-update.json",
      JSON.stringify({
        mint: mint.toBase58(),
        uri,
        signature,
        explorer: transactionLink(signature),
      }, null, 2)
    );
    console.log("Транзакция:", transactionLink(signature));
  } else {
    console.log("Нужный URI уже установлен.");
  }

  const saved = await getTokenMetadata(
    connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  if (saved?.uri !== uri) {
    throw new Error("URI после обновления не совпал");
  }

  console.log("Название:", saved.name);
  console.log("Символ:", saved.symbol);
  console.log("URI:", saved.uri);
  console.log("JSON доступен, метаданные проверены.");
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error("Ошибка:", error.message ?? error);
    process.exit(1);
  }
);
