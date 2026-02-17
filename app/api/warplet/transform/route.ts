import { NextResponse } from "next/server";
import {
  insertWarpletTransform,
  getWarpletTransform,
} from "@/lib/transform-store";
import {
  resolveLegacyWarplet,
  WarpletNotFoundError,
} from "@/lib/warplet";
import { generateYarnImageFromBuffer } from "@/lib/gemini";
import { fileFromBase64, uploadFileToPinata } from "@/lib/pinata";

export const runtime = "nodejs";

function toFid(value: unknown): number {
  const fid = Number(value);
  if (!Number.isInteger(fid) || fid <= 0) {
    throw new Error("Invalid fid");
  }
  return fid;
}

async function fetchImageBuffer(imageUrl: string) {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch source Warplet image");
  }
  const mimeType = response.headers.get("content-type") || "image/png";
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = toFid(body?.fid);

    const existing = await getWarpletTransform(fid);
    if (existing) {
      return NextResponse.json(
        {
          error: "Transform already exists for this fid",
          cid: existing.cid,
          gatewayUrl: existing.gatewayUrl,
        },
        { status: 409 }
      );
    }

    const { image } = await resolveLegacyWarplet(fid);
    const { buffer, mimeType } = await fetchImageBuffer(image);

    const generated = await generateYarnImageFromBuffer(buffer, mimeType);
    const file = fileFromBase64({
      imageBase64: generated.data,
      mimeType: generated.mimeType,
      name: `buttlet-${fid}.png`,
    });
    const { cid, gatewayUrl } = await uploadFileToPinata(file);

    const record = await insertWarpletTransform({
      fid,
      cid,
      gatewayUrl,
      imageUrl: gatewayUrl,
    });

    return NextResponse.json(
      {
        fid: record.fid,
        cid: record.cid,
        gatewayUrl: record.gatewayUrl,
        imageUrl: record.imageUrl,
        createdAt: record.createdAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof WarpletNotFoundError) {
      return NextResponse.json(
        { error: err.message },
        { status: 404 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Failed to transform Warplet";
    if (message === "Transform already exists for this fid") {
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

