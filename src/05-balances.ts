import {
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getAccount,
  getTokenMetadata,
  getMetadataPointerState,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as fs from "node:fs";
import { connection, loadWallet, addressLink } from "./common";

async function main() {
  const owner = loadWallet("wallet1.json").publicKey;
  const recipient = loadWallet("wallet2.json").publicKey;
  const mint = loadWallet("mint.json").publicKey;

  const info = await getMint(
    connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const metadata = await getTokenMetadata(
    connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID
  );
  const pointer = getMetadataPointerState(info);
  const unit = 10n ** BigInt(info.decimals);

  const accounts = [];
  for (const wallet of [owner, recipient]) {
    const address = getAssociatedTokenAddressSync(
      mint, wallet, false, TOKEN_2022_PROGRAM_ID
    );
    accounts.push(await getAccount(
      connection, address, "confirmed", TOKEN_2022_PROGRAM_ID
    ));
  }

  const checks = [
    ["Название и символ",
      metadata?.name === "Karina Token" && metadata?.symbol === "KRN"],
    ["Decimals = 6", info.decimals === 6],
    ["MetadataPointer указывает на mint",
      pointer?.metadataAddress?.equals(mint) === true],
    ["Общий выпуск = 1000 KRN", info.supply === 1000n * unit],
    ["Баланс владельца = 900 KRN", accounts[0].amount === 900n * unit],
    ["Баланс получателя = 100 KRN", accounts[1].amount === 100n * unit],
    ["Сумма балансов равна выпуску",
      accounts[0].amount + accounts[1].amount === info.supply],
  ] as const;

  console.log("Сеть: Solana Devnet");
  console.log("Программа: Token-2022");
  console.log("Mint:", mint.toBase58());
  console.log("Название:", metadata?.name);
  console.log("Символ:", metadata?.symbol);
  console.log("URI:", metadata?.uri || "пока не задан");
  console.log("Общий выпуск:", String(info.supply / unit), "KRN");
  console.log("Владелец:", String(accounts[0].amount / unit), "KRN");
  console.log("Получатель:", String(accounts[1].amount / unit), "KRN");
  console.log("Explorer:", addressLink(mint.toBase58()));

  for (const [label, passed] of checks) {
    console.log(`${passed ? "OK" : "ОШИБКА"}: ${label}`);
  }

  if (checks.some(([, passed]) => !passed)) {
    throw new Error("Не все проверки пройдены");
  }

  fs.mkdirSync("receipts", { recursive: true });
  fs.writeFileSync(
    "receipts/verification.json",
    JSON.stringify({
      network: "devnet",
      mint: mint.toBase58(),
      name: metadata?.name,
      symbol: metadata?.symbol,
      uri: metadata?.uri,
      decimals: info.decimals,
      supply: "1000",
      owner: owner.toBase58(),
      ownerBalance: "900",
      recipient: recipient.toBase58(),
      recipientBalance: "100",
      checksPassed: checks.length,
      checkedAt: new Date().toISOString(),
    }, null, 2)
  );
  console.log("Все 7 проверок пройдены.");
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error("Ошибка:", error.message ?? error);
    process.exit(1);
  }
);
