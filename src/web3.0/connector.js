import { ethers } from "ethers";
import contractJson from "./abis/PropertyNFT.json" with { type: "json" };
import dotenv from "dotenv";
dotenv.config();

if (!process.env.RPC_URL) throw new Error("RPC_URL not set");
if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not set");
if (!process.env.CONTRACT_ADDRESS) throw new Error("CONTRACT_ADDRESS not set");

const abi = contractJson.abi;

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const privateKey = process.env.PRIVATE_KEY.startsWith("0x")
  ? process.env.PRIVATE_KEY
  : "0x" + process.env.PRIVATE_KEY;

const wallet = new ethers.Wallet(privateKey, provider);

const nft = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  abi,
  wallet
);

export async function setMerkleRoot(root) {
  try {
    const tx = await nft.setMerkleRoot(root);
    await tx.wait();
    console.log("Merkle root set:", root);
  } catch (error) {
    console.error("Error setting Merkle root:", error);
    throw error;
  }
}
