import { ethers } from "ethers";
import abi from "./abis/PropertyNFT.json";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

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
