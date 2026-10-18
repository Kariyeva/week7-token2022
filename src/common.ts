import "dotenv/config";
import {
  Connection,
  Keypair,
} from "@solana/web3.js";
import * as fs from "node:fs";
import * as path from "node:path";

const rpcUrl = process.env.SOLANA_RPC_URL;
if (!rpcUrl) {
  throw new Error("В файле .env не указан SOLANA_RPC_URL");
}
if (new URL(rpcUrl).hostname !== "devnet.helius-rpc.com") {
  throw new Error("Нужен RPC-адрес Helius для Devnet");
}

export const connection = new Connection(rpcUrl, "confirmed");

const keysDir = path.join(process.cwd(), "keys");

export function loadOrCreateWallet(filename: string): Keypair {
  fs.mkdirSync(keysDir, { recursive: true });

  const file = path.join(keysDir, filename);

  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Keypair.fromSecretKey(Uint8Array.from(data));
  }

  const wallet = Keypair.generate();

  fs.writeFileSync(
    file,
    JSON.stringify(Array.from(wallet.secretKey)),
    { flag: "wx", mode: 0o600 }
  );

  return wallet;
}

export function loadWallet(filename: string): Keypair {
  const file = path.join(keysDir, filename);

  if (!fs.existsSync(file)) {
    throw new Error("Сначала выполните npm run wallets");
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(data));
}

export function addressLink(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

export function transactionLink(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}