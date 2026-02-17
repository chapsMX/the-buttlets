import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ fid: string }> }
) {
  const { fid: fidParam } = await ctx.params;
  const fidNum = Number(fidParam);

  if (!Number.isFinite(fidNum) || fidNum <= 0) {
    return NextResponse.json({ message: "Invalid fid" }, { status: 400 });
  }

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "NEYNAR_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    // Use the bulk endpoint per documentation
    const bulk = new URL("https://api.neynar.com/v2/farcaster/user/bulk/");
    bulk.searchParams.set("fids", String(fidNum));

    console.log("[Neynar] Bulk fetch start", {
      fid: fidNum,
      url: bulk.toString(),
    });

    const res = await fetch(bulk.toString(), {
      headers: {
        "accept": "application/json",
        "x-api-key": apiKey,
        "x-neynar-experimental": "false",
      },
      cache: "no-store",
    });

    console.log("[Neynar] Bulk status", res.status);
    if (res.status === 404) {
      return NextResponse.json(
        { message: `User ${fidNum} not found` },
        { status: 404 }
      );
    }
    if (!res.ok) {
      const text = await res.text();
      console.warn("[Neynar] Bulk error body", text);
      return NextResponse.json(
        { message: `Neynar error (${res.status})` },
        { status: 502 }
      );
    }

    const json = await res.json();

    // Flexible parsing across possible shapes
    const user =
      json?.result?.user ||
      json?.user ||
      (Array.isArray(json?.result?.users) ? json.result.users[0] : null) ||
      (Array.isArray(json?.users) ? json.users[0] : null) ||
      null;

    console.log("[Neynar] Parsed user keys", {
      hasResult: Boolean(json?.result),
      hasUserRoot: Boolean(json?.user),
      hasUsersArray: Array.isArray(json?.users),
      username: user?.username,
      fid: user?.fid,
    });

    if (!user) {
      return NextResponse.json(
        { message: "User payload missing" },
        { status: 502 }
      );
    }

    // Normalize pfp url across response variants
    const pfpUrl: string | null =
      user?.pfp?.url ?? user?.pfp_url ?? user?.profile?.pfp?.url ?? null;

    console.log("[Neynar] PFP resolution", {
      pfpFromPfpUrl: user?.pfp?.url ?? null,
      pfpFromRoot: user?.pfp_url ?? null,
      pfpFromProfile: user?.profile?.pfp?.url ?? null,
      chosen: pfpUrl,
    });

    const profile = {
      fid: user.fid,
      username: user.username,
      pfpUrl,
    };

    return NextResponse.json(profile, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error: unknown) {
    console.error("[Neynar] Unexpected error", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}


