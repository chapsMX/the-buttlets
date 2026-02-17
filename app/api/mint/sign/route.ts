import { NextResponse } from "next/server";
import {
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  getAddress,
  toHex,
  hexToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function toBigIntSafe(n: string | number | bigint): bigint {
  try {
    return BigInt(n);
  } catch {
    throw new Error(`Invalid numeric value: ${String(n)}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = toBigIntSafe(body?.fid);
    const cid = body?.cid as string;
    const recipient = getAddress(body?.recipient as string);
    const now = Math.floor(Date.now() / 1000);
    const deadline = toBigIntSafe(body?.deadline ?? now + 60 * 30); // default 30m

    // Always use server-side config to avoid mismatches
    const contractAddress = getAddress(requireEnv("CONTRACT_ADDRESS"));
    const chainId = toBigIntSafe(process.env.CHAIN_ID || 8453); // default Base mainnet

    if (!cid || typeof cid !== "string") {
      return NextResponse.json({ error: "cid is required" }, { status: 400 });
    }

    const pk = requireEnv("VERIFIER_PRIVATE_KEY");
    const normalizedPk = (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
    const account = privateKeyToAccount(normalizedPk);

    // typeHash = keccak256("WarpletAIMint(uint256 fid,address recipient,string cid,address contractAddress,uint256 chainId,uint256 deadline)")
    const typeString =
      "WarpletAIMint(uint256 fid,address recipient,string cid,address contractAddress,uint256 chainId,uint256 deadline)";
    const typeHash = keccak256(toHex(typeString));
    const cidHash = keccak256(toHex(cid));

    const encoded = encodeAbiParameters(
      parseAbiParameters("bytes32,uint256,address,bytes32,address,uint256,uint256"),
      [typeHash, fid, recipient, cidHash, contractAddress, chainId, deadline]
    );
    const message = keccak256(encoded);

    // EIP-191 prefix signing over 32-byte hash
    const signature = await account.signMessage({
      message: { raw: hexToBytes(message) },
    });

    return NextResponse.json(
      {
        signature,
        signer: account.address,
        fid: fid.toString(),
        recipient,
        cid,
        contractAddress,
        chainId: chainId.toString(),
        deadline: deadline.toString(),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


