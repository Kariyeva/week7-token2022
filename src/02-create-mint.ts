import {
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  TYPE_SIZE,
  LENGTH_SIZE,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  getMint,
  getTokenMetadata,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import {
  connection,
  loadWallet,
  loadOrCreateWallet,
  addressLink,
  transactionLink,
} from "./common";

async function main() {
  const owner = loadWallet("wallet1.json");
  const mint = loadOrCreateWallet("mint.json");

  const metadata: TokenMetadata = {
    updateAuthority: owner.publicKey,
    mint: mint.publicKey,
    name: "Karina Token",
    symbol: "KRN",
    uri: "",
    additionalMetadata: [],
  };

  const existing = await connection.getAccountInfo(mint.publicKey);

  if (!existing) {
    const mintSize = getMintLen([ExtensionType.MetadataPointer]);
    const metadataSize = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
    const rent = await connection.getMinimumBalanceForRentExemption(
      mintSize + metadataSize
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: owner.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintSize,
        lamports: rent,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mint.publicKey,
        owner.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mint.publicKey,
        6,
        owner.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint.publicKey,
        updateAuthority: owner.publicKey,
        mint: mint.publicKey,
        mintAuthority: owner.publicKey,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [owner, mint],
      { commitment: "confirmed" }
    );

    console.log("Транзакция создания:", transactionLink(signature));
  } else {
    console.log("Mint уже существует. Проверяем его данные.");
  }

  const mintInfo = await getMint(
    connection, mint.publicKey, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const savedMetadata = await getTokenMetadata(
    connection, mint.publicKey, "confirmed", TOKEN_2022_PROGRAM_ID
  );

  if (!savedMetadata) {
    throw new Error("Метаданные токена не найдены");
  }

  console.log("Название:", savedMetadata.name);
  console.log("Символ:", savedMetadata.symbol);
  console.log("Decimals:", mintInfo.decimals);
  console.log("Выпущено базовых единиц:", mintInfo.supply.toString());
  console.log("Адрес mint:", mint.publicKey.toBase58());
  console.log("Explorer:", addressLink(mint.publicKey.toBase58()));
}

main().catch((error) => {
  console.error("Ошибка:", error.message ?? error);
  process.exitCode = 1;
});
