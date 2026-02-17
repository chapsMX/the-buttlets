import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWarpletTransform } from "@/lib/transform-store";

export const dynamic = "force-dynamic";

const APP_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const RAW_IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/+$/, "") || "https://ipfs.io/ipfs";

type ShareMintPageProps = {
  params: Promise<{ fid: string }>;
};

type ShareMintData = {
  fid: number;
  imageUrl: string;
  createdAt: Date;
};

async function getShareMintData(fid: number): Promise<ShareMintData | null> {
  const transform = await getWarpletTransform(fid);
  if (!transform) {
    return null;
  }
  const imageUrl =
    resolveDisplayUrl(transform.imageUrl) ||
    resolveDisplayUrl(transform.gatewayUrl) ||
    resolveDisplayUrl(`ipfs://${transform.cid}`);

  if (!imageUrl) {
    return null;
  }

  return {
    fid,
    imageUrl,
    createdAt: transform.createdAt,
  };
}

function resolveDisplayUrl(uri?: string | null) {
  if (!uri) {
    return null;
  }
  if (uri.startsWith("ipfs://")) {
    const path = uri.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `${RAW_IPFS_GATEWAY}/${path}`;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  if (uri.startsWith("/")) {
    return `${APP_URL}${uri}`;
  }
  return `${APP_URL}/${uri}`;
}

function parseFid(raw: string): number {
  const fid = Number(raw);
  if (!Number.isInteger(fid) || fid <= 0) {
    throw new Error("Invalid fid");
  }
  return fid;
}

function ensureAbsolute(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${APP_URL}${url}`;
  }
  return `${APP_URL}/${url}`;
}

export async function generateMetadata({
  params,
}: ShareMintPageProps): Promise<Metadata> {
  const { fid: rawFid } = await params;
  const fid = parseFid(rawFid);
  const data = await getShareMintData(fid);
  if (!data) {
    notFound();
  }

  const shareUrl = `${APP_URL}/share-mint/${fid}`;
  const shareImageUrl = `${APP_URL}/api/image/${fid}`;
  const frame = {
    version: "next",
    imageUrl: shareImageUrl,
    button: {
      title: "Mint your Clawplet",
      action: {
        type: "launch_frame",
        name: "Mint",
        url: APP_URL,
        splashImageUrl: ensureAbsolute("/splash.png"),
        splashBackgroundColor: "#6A3CFF",
      },
    },
  };

  return {
    metadataBase: new URL(APP_URL),
    title: `🦞 Clawplet #${fid}`,
    description: "Mint your own Clawplet based on your Farcaster Warplet 🚀",
    openGraph: {
      type: "website",
      url: shareUrl,
      title: `🦞 Clawplet #${fid}`,
      description: "Mint your own Clawlet based on your Warplet 🚀",
      images: [{ url: shareImageUrl }],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default async function ShareMintPage({ params }: ShareMintPageProps) {
  const { fid: rawFid } = await params;
  const fid = parseFid(rawFid);
  const data = await getShareMintData(fid);
  if (!data) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
      }}
    >
{/*       <h1 style={{ margin: 0, fontSize: 24 }}>Amigurumi Warplet #{data.fid}</h1>
      <p style={{ margin: 0, maxWidth: 360 }}>
        Share your freshly crocheted Warplet with friends on Farcaster and invite them to mint
        theirs!
      </p> */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
{/*       <img
        src={data.imageUrl}
        alt={`Crochet Warplet ${data.fid}`}
        style={{ width: "100%", maxWidth: 320, borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
      />
      <a
        href={APP_URL}
        style={{
          display: "inline-block",
          marginTop: 8,
          padding: "10px 20px",
          borderRadius: 999,
          background: "#6A3CFF",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Mint your own
      </a> */}
    </main>
  );
}

