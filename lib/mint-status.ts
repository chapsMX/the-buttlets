import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;

const chainId = Number(process.env.CHAIN_ID ?? 8453);
const chain = chainId === base.id ? base : baseSepolia;
const defaultRpc =
  chainId === base.id ? "https://mainnet.base.org" : "https://sepolia.base.org";
const mintRpcUrl =
  process.env.MINT_RPC_URL ||
  process.env.BASE_RPC_URL ||
  defaultRpc;

const client = createPublicClient({
  chain,
  transport: http(mintRpcUrl),
});

const erc721Abi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },
] as const;

export async function getMintStatus(fid: number) {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error("Missing CONTRACT_ADDRESS env for mint status checks");
    }
    const owner = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: erc721Abi,
      functionName: "ownerOf",
      args: [BigInt(fid)],
    });
    return { hasMinted: true, owner };
  } catch {
    return { hasMinted: false, owner: null };
  }
}

