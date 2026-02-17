import { NextResponse } from "next/server";
import { resolveLegacyWarplet, WarpletNotFoundError } from "@/lib/warplet";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ fid: string }> }
) {
  const { fid: fidParam } = await ctx.params;
  const fidNum = Number(fidParam);

  if (!Number.isFinite(fidNum) || fidNum < 0) {
    return NextResponse.json({ message: "Invalid fid" }, { status: 400 });
  }

  try {
    const { tokenUri, image } = await resolveLegacyWarplet(fidNum);
    return NextResponse.json(
      { tokenId: fidNum, tokenUri, image },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    const isNotFound = e instanceof WarpletNotFoundError;
    const message =
      e instanceof Error ? e.message : "Unexpected error fetching Warplet";
    const status = isNotFound ? 404 : 500;
    return NextResponse.json(
      { message: status === 404 ? `No Warplet found for FID ${fidNum}` : message },
      {
        status,
        headers:
          status === 404
            ? { "Cache-Control": "s-maxage=30, stale-while-revalidate=120" }
            : undefined,
      }
    );
  }
}
