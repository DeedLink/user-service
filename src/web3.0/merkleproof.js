import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { setMerkleRoot } from "./connector.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WHITELIST_FILE = path.join(__dirname, "../data/whitelist.json");

const dataDir = path.dirname(WHITELIST_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(WHITELIST_FILE)) fs.writeFileSync(WHITELIST_FILE, "[]", "utf-8");

function loadWhitelist() {
  return JSON.parse(fs.readFileSync(WHITELIST_FILE, "utf-8"));
}

function saveWhitelist(list) {
  fs.writeFileSync(WHITELIST_FILE, JSON.stringify(list, null, 2));
}

export async function appendAddress(address) {
  console.log("Appending address to whitelist:", address);
  const list = loadWhitelist();
  if (!list.includes(address)) {
    list.push(address);
    saveWhitelist(list);
    await updateMerkle(list);
    console.log("Address appended successfully:", address);
  } else {
    console.log("Address already in whitelist:", address);
  }
}


export async function removeAddress(address) {
  let list = loadWhitelist();
  list = list.filter((a) => a.toLowerCase() !== address.toLowerCase());
  saveWhitelist(list);
  await updateMerkle(list);
}

export async function updateAddress(oldAddress, newAddress) {
  let list = loadWhitelist();
  const idx = list.findIndex((a) => a.toLowerCase() === oldAddress.toLowerCase());
  if (idx !== -1) {
    list[idx] = newAddress;
    saveWhitelist(list);
    await updateMerkle(list);
  }
}

export function buildTree() {
  const list = loadWhitelist();
  const tree = StandardMerkleTree.of(list.map((a) => [a]), ["address"]);
  console.log("Merkle Root:", tree.root);
  return tree;
}

export function getProof(address) {
  const tree = buildTree();
  for (const [i, v] of tree.entries()) {
    if (v[0].toLowerCase() === address.toLowerCase()) {
      return tree.getProof(i);
    }
  }
  throw new Error("Address not in whitelist");
}

async function updateMerkle(list) {
  const tree = StandardMerkleTree.of(list.map((a) => [a]), ["address"]);
  const root = tree.root;
  await setMerkleRoot(root);
}
