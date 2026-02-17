import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const WARPLETS_CONTRACT =
  (process.env.WARPLETS_CONTRACT_ADDRESS ||
    "0x699727f9e01a822efdcf7333073f0461e5914b4e") as `0x${string}`;

const erc721MetadataAbi = [
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";

export class WarpletNotFoundError extends Error {
  constructor(fid: number) {
    super(`No Warplet found for fid ${fid}`);
    this.name = "WarpletNotFoundError";
  }
}

const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

function toHttpFromIpfs(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) {
    const gateway =
      process.env.IPFS_GATEWAY?.replace(/\/+$/, "") || "https://ipfs.io/ipfs";
    const path = uri.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `${gateway}/${path}`;
  }
  return uri;
}

function parseDataUriJson(uri: string): unknown | null {
  try {
    if (!uri.startsWith("data:application/json")) return null;
    const [, payload] = uri.split(",");
    if (!payload) return null;
    const isBase64 = uri.includes(";base64,");
    const jsonString = isBase64
      ? Buffer.from(payload, "base64").toString("utf-8")
      : decodeURIComponent(payload);
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

type WarpletMetadata = {
  image?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
};

function isWarpletMetadata(value: unknown): value is WarpletMetadata {
  return typeof value === "object" && value !== null;
}

export async function resolveLegacyWarplet(fid: number) {
  let tokenUri: string;
  try {
    tokenUri = await client.readContract({
      address: WARPLETS_CONTRACT,
      abi: erc721MetadataAbi,
      functionName: "tokenURI",
      args: [BigInt(fid)],
    });
  } catch {
    throw new WarpletNotFoundError(fid);
  }

  let metadata: WarpletMetadata | null = null;
  const parsed = parseDataUriJson(tokenUri);
  if (isWarpletMetadata(parsed)) {
    metadata = parsed;
  }

  if (!metadata) {
    const resolvedTokenUri = toHttpFromIpfs(tokenUri);
    const res = await fetch(resolvedTokenUri, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error("Failed to fetch token metadata");
    }
    const json = await res.json();
    if (!isWarpletMetadata(json)) {
      throw new Error("Invalid token metadata payload");
    }
    metadata = json;
  }

  const rawImage: string | undefined =
    metadata?.image ?? metadata?.image_url ?? undefined;
  if (!rawImage) {
    throw new Error("Metadata missing image field");
  }

  const image = toHttpFromIpfs(rawImage);

  return {
    fid,
    tokenUri,
    image,
    metadata,
  };
}

