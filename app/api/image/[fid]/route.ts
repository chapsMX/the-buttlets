import React from "react";
import { ImageResponse } from "next/og";
import { getWarpletTransform } from "@/lib/transform-store";
import { loadGoogleFont, loadImage } from "@/lib/og-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const size = { width: 1200, height: 630 };

const APP_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const RAW_IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/+$/, "") || "https://ipfs.io/ipfs";

const FALLBACK_IMAGE = `${APP_URL}/hero.png`;

function resolveDisplayUrl(uri?: string | null) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const path = uri.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `${RAW_IPFS_GATEWAY}/${path}`;
  }
  return uri;
}

function parseFid(raw: string) {
  const fid = Number(raw);
  if (!Number.isInteger(fid) || fid <= 0) {
    throw new Error("Invalid fid");
  }
  return fid;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid: rawFid } = await params;
    const fid = parseFid(rawFid);

    const transform = await getWarpletTransform(fid);
    const originalWarpletImageUrl = await getOriginalWarpletImageUrl(fid);
    const warpletImageUrl =
      resolveDisplayUrl(transform?.imageUrl) ??
      resolveDisplayUrl(transform?.gatewayUrl) ??
      FALLBACK_IMAGE;
    const baseWarpletImageUrl = originalWarpletImageUrl ?? FALLBACK_IMAGE;

    const [
      { data: originalImageData, contentType: originalContentType },
      { data: warpletImageData, contentType },
      fontData,
    ] = await Promise.all([
      loadImage(baseWarpletImageUrl),
      loadImage(warpletImageUrl),
      loadGoogleFont(
        "Space+Grotesk:wght@600",
        ``
      ).catch(() => null),
    ]);

    const originalImageBase64 = Buffer.from(originalImageData).toString("base64");
    const warpletImageBase64 = Buffer.from(warpletImageData).toString("base64");
    const originalImageSrc = `data:${
      originalContentType ?? "image/png"
    };base64,${originalImageBase64}`;
    const warpletImageSrc = `data:${contentType ?? "image/png"};base64,${warpletImageBase64}`;

    const tree = React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "12px 12px",
          backgroundColor: "#6A3CFF",
          color: "#fff",
          fontFamily: "Space Grotesk, sans-serif",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 72,
            fontWeight: 700,
            textAlign: "center",
            width: "100%",
            justifyContent: "center",
          },
        },
        `Buttlet #${fid}!`
      ),
      React.createElement(
        "div",
        {
          style: {
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          },
        },
        React.createElement("img", {
          src: originalImageSrc,
          alt: `Original Warplet ${fid}`,
          width: 400,
          height: 400,
          style: {
            width: 400,
            height: 400,
            objectFit: "cover",
            borderRadius: 32,
            boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
          },
        }),
        React.createElement(
          "div",
          {
            style: {
              fontSize: 48,
              fontWeight: 700,
              color: "#ffffff",
            },
          },
          "> 🍑 >"
        ),
        React.createElement("img", {
          src: warpletImageSrc,
          alt: `Buttlet ${fid}`,
          width: 400,
          height: 400,
          style: {
            width: 400,
            height: 400,
            objectFit: "cover",
            borderRadius: 32,
            boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
          },
        })
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: 56,
            fontWeight: 700,
            textAlign: "center",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          },
        },
        `Rotate and mint a Buttlet 🍑`
      )
    );

    return new ImageResponse(tree, {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Space Grotesk",
              data: fontData,
              weight: 600,
              style: "normal",
            },
          ]
        : [],
    });
  } catch (error) {
    console.error("[og-image] Failed to generate image", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}

async function getOriginalWarpletImageUrl(fid: number) {
  try {
    const res = await fetch(`${APP_URL}/api/warplet/${fid}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data: { image?: string } = await res.json();
    return resolveDisplayUrl(data.image);
  } catch (error) {
    console.warn("[og-image] Failed to fetch original warplet image", error);
    return null;
  }
}

