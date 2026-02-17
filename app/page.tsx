"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { sdk as farcasterMiniAppSdk } from "@farcaster/miniapp-sdk";
import { encodeFunctionData, parseAbi, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Transaction, TransactionButton } from "@coinbase/onchainkit/transaction";
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownBasename,
  WalletDropdownFundLink,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet";
import { Identity, Avatar, Name, Address, EthBalance } from "@coinbase/onchainkit/identity";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
// import { useQuickAuth } from "@coinbase/onchainkit/minikit";
import styles from "./page.module.css";

type WarpletStatusResponse = {
  fid: number;
  hasTransformed: boolean;
  transform: {
    cid: string;
    gatewayUrl: string | null;
    imageUrl: string | null;
    createdAt: string;
  } | null;
  hasMinted: boolean;
  owner: string | null;
};

type MiniKitUserWithLegacyPfp = {
  username?: string | null;
  fid?: number;
  pfp?: { url?: string | null } | null;
  pfp_url?: string | null;
};

const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ??
  ("0x29c60B24eF9ce57a95fE552EDF80F440F7f0B6fc" as `0x${string}`);
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);
const MINT_VALUE = parseEther("0.00037");
const VIEW_TOKEN_BASE_URL =
  CHAIN_ID === 8453
    ? "https://opensea.io/item/base"
    : "https://testnet.rarible.com/token/base";
const TX_EXPLORER_BASE_URL =
  CHAIN_ID === 8453
    ? "https://basescan.org/tx"
    : "https://sepolia.basescan.org/tx";

const RAW_IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/+$/, "") ||
  "https://ipfs.io/ipfs";

function resolveDisplayUrl(uri?: string | null) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const path = uri.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `${RAW_IPFS_GATEWAY}/${path}`;
  }
  return uri;
}

function resolveContextPfpUrl(user?: MiniKitUserWithLegacyPfp | null) {
  if (!user) return null;
  if (user.pfp && typeof user.pfp.url === "string" && user.pfp.url.length > 0) {
    return user.pfp.url;
  }
  if (typeof user.pfp_url === "string" && user.pfp_url.length > 0) {
    return user.pfp_url;
  }
  return null;
}

const TRANSFORM_MESSAGES = [
  "Collecting your Warplet's DNA... 🧬",
  "Spinning it around to face the other way... 🔄",
  "Enhancing the rear view... 🍑",
  "Adding some extra cushion... 🛋️",
  "Sculpting that signature curve... 🎨",
  "Making sure it pops... 💥",
  "Giving your Buttlet its soul... ✨",
  "Snapping that cheeky blockchain selfie... 📸",
  "Wrapping up with extra sass... 💅",
  "Almost ready... ⏳",
];

export default function Home() {
  // If you need to verify the user's identity, you can use the useQuickAuth hook.
  // This hook will verify the user's signature and return the user's FID. You can update
  // this to meet your needs. See the /app/api/auth/route.ts file for more details.
  // Note: If you don't need to verify the user's identity, you can get their FID and other user data
  // via `useMiniKit().context?.user`.
  // const { data, isLoading, error } = useQuickAuth<{
  //   userFid: string;
  // }>("/api/auth");

  const { setMiniAppReady, isMiniAppReady, context } = useMiniKit();
  const [warpletImage, setWarpletImage] = useState<string | null>(null);
  const [warpletError, setWarpletError] = useState<string | null>(null);
  const [profilePfpUrl, setProfilePfpUrl] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const { address } = useAccount();
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);
  const [mintedImageUrl, setMintedImageUrl] = useState<string | null>(null);
  const [isMintModalOpen, setIsMintModalOpen] = useState<boolean>(false);
  const [, setLastModalTxHash] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const userFid = context?.user?.fid;
  const [warpletStatus, setWarpletStatus] = useState<WarpletStatusResponse | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [transformedCid, setTransformedCid] = useState<string | null>(null);
  const [transformedImageUrl, setTransformedImageUrl] = useState<string | null>(null);
  const [transformStepIdx, setTransformStepIdx] = useState<number | null>(null);
  const [transformImageToken, setTransformImageToken] = useState<string | null>(null);
  const [warpletImageReloadToken, setWarpletImageReloadToken] = useState(0);
  const wasTransformingRef = useRef(false);
  const shareTxHashRef = useRef<string | null>(null);
  const hasAutoPromptedAddMiniAppRef = useRef(false);
  const [isFarcasterSdkReady, setIsFarcasterSdkReady] = useState(false);
  const [isAddingMiniApp, setIsAddingMiniApp] = useState(false);
  const [addMiniAppError, setAddMiniAppError] = useState<string | null>(null);
  const legacyContextUser = (context?.user as MiniKitUserWithLegacyPfp | undefined) ?? null;
  const clientAdded = (context?.client as { added?: boolean } | undefined)?.added ?? false;
  const contextPfpUrl = resolveContextPfpUrl(legacyContextUser);
  const displayPfpUrl = profilePfpUrl ?? contextPfpUrl;

  const refreshStatus = useCallback(
    async (options?: { preserveTransform?: boolean }) => {
      const preserveTransform = options?.preserveTransform ?? false;
      if (!userFid) {
        setWarpletStatus(null);
        setTransformedCid(null);
        setTransformedImageUrl(null);
        setTransformImageToken(null);
        return;
      }
      setIsStatusLoading(true);
      try {
        const res = await fetch(`/api/warplet/status?fid=${userFid}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Status fetch failed (${res.status})`);
        }
        const data: WarpletStatusResponse = await res.json();
        console.log("[status] fetched", { fid: userFid, data, preserveTransform });
        setWarpletStatus(data);
        if (data.transform) {
          setTransformedCid(data.transform.cid);
          setTransformedImageUrl(
            data.transform.imageUrl ?? data.transform.gatewayUrl ?? null
          );
          setTransformImageToken(Date.now().toString());
        } else if (!preserveTransform) {
          setTransformedCid(null);
          setTransformedImageUrl(null);
          setTransformImageToken(null);
        }
      } catch (error) {
        console.error("[status] fetch failed", error);
        // Set default status on error to allow transform if warpletImage exists
        setWarpletStatus({
          fid: userFid,
          hasTransformed: false,
          hasMinted: false,
          transform: null,
          owner: null,
        });
      } finally {
        setIsStatusLoading(false);
      }
    },
    [userFid]
  );

  const handleMintModalClose = useCallback(() => {
    setIsMintModalOpen(false);
    refreshStatus({ preserveTransform: true });
    setWarpletImageReloadToken((prev) => prev + 1);
    setTransformImageToken(Date.now().toString());
  }, [refreshStatus]);

  useEffect(() => {
    if (!isMintModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleMintModalClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMintModalOpen, handleMintModalClose]);

  useEffect(() => {
    if (userFid) {
      refreshStatus();
    }
  }, [userFid, refreshStatus, warpletImageReloadToken]);
  
  // Also refresh status when warpletImage is successfully loaded
  useEffect(() => {
    if (userFid && warpletImage && !warpletError && warpletStatus === null) {
      console.log("[ui] Warplet image loaded, refreshing status");
      refreshStatus();
    }
  }, [userFid, warpletImage, warpletError, warpletStatus, refreshStatus]);

  useEffect(() => {
    if (!isTransforming && wasTransformingRef.current) {
      if (!transformError) {
        setWarpletImageReloadToken((prev) => prev + 1);
        setTransformImageToken(Date.now().toString());
        refreshStatus({ preserveTransform: true });
      }
    }
    wasTransformingRef.current = isTransforming;
  }, [isTransforming, transformError, refreshStatus]);

  const derivedTransformedImageUrl = useMemo(() => {
    const base =
      resolveDisplayUrl(transformedImageUrl) ??
      (transformedCid ? resolveDisplayUrl(`ipfs://${transformedCid}`) : null);
    if (!base) return null;
    if (!transformImageToken) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}t=${transformImageToken}`;
  }, [transformedImageUrl, transformedCid, transformImageToken]);

  const displayedWarpletImage = derivedTransformedImageUrl ?? warpletImage;
  const modalImage = mintedImageUrl ?? displayedWarpletImage;
  const viewTokenLink = useMemo(() => {
    if (
      !CONTRACT_ADDRESS ||
      CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
    ) {
      return null;
    }
    const tokenId = mintedTokenId ?? userFid ?? null;
    if (!tokenId) return null;
    return `${VIEW_TOKEN_BASE_URL}/${CONTRACT_ADDRESS}/${tokenId}`;
  }, [mintedTokenId, userFid]);
  // canTransform: user has warplet image, hasn't transformed yet, and not currently transforming
  // Note: hasMinted refers to the Buttlet NFT, not the original Warplet, so we don't check it here
  const canTransform =
    Boolean(warpletImage) &&
    !warpletError &&
    (warpletStatus === null || !warpletStatus.hasTransformed) &&
    !isTransforming &&
    !isStatusLoading;
  const canMint =
    Boolean(address && transformedCid) &&
    !warpletStatus?.hasMinted &&
    !isTransforming;

  useEffect(() => {
    console.log("[ui] status snapshot", {
      fid: userFid,
      warpletStatus,
      address,
      transformedCid,
      canMint,
      canTransform,
      warpletImage: warpletImage ? "exists" : "null",
      warpletError,
      hasTransformed: warpletStatus?.hasTransformed,
      hasMinted: warpletStatus?.hasMinted,
      isTransforming,
      isStatusLoading,
      // Breakdown of canTransform condition
      conditionBreakdown: {
        hasWarpletImage: Boolean(warpletImage),
        noWarpletError: !warpletError,
        notTransformed: warpletStatus === null || !warpletStatus.hasTransformed,
        notTransforming: !isTransforming,
        notLoading: !isStatusLoading,
        // Note: hasMinted refers to Buttlet NFT, not relevant for transform button
        hasMintedButtlet: warpletStatus?.hasMinted ?? false,
      },
    });
  }, [warpletStatus, address, transformedCid, canMint, canTransform, userFid, warpletImage, warpletError, isTransforming, isStatusLoading]);

  const transactionCalls = useMemo(() => {
    return async () => {
      const fid = Number(userFid);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 30;
      if (!address) throw new Error("Connect wallet first");
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS");
      }
      if (!fid) {
        throw new Error("Missing user fid");
      }
      if (!transformedCid) {
        throw new Error("Generate your crochet Warplet first");
      }
      const previewImageUrl = derivedTransformedImageUrl ?? displayedWarpletImage;
      const signRes = await fetch("/api/mint/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          cid: transformedCid,
          recipient: address,
          deadline,
          // Server uses its own CONTRACT_ADDRESS/CHAIN_ID; do not send from client
        }),
      });
      if (!signRes.ok) {
        const text = await signRes.text();
        throw new Error(`Sign failed: ${text}`);
      }
      const { signature } = await signRes.json();
      const abi = parseAbi([
        "function mint(uint256 fid, string cid, uint256 deadline, bytes signature) payable",
      ]);
      const data = encodeFunctionData({
        abi,
        functionName: "mint",
        args: [BigInt(fid), transformedCid, BigInt(deadline), signature as `0x${string}`],
      });
      setMintedTokenId(fid);
      setMintedImageUrl(previewImageUrl);
      return [
        {
          to: CONTRACT_ADDRESS as `0x${string}`,
          data,
          value: MINT_VALUE,
        },
      ];
    };
  }, [address, userFid, transformedCid, derivedTransformedImageUrl, displayedWarpletImage]);

  const shareBaseUrl = useMemo(() => {
    const envUrl = process.env.NEXT_PUBLIC_URL;
    if (envUrl && envUrl.length > 0) {
      return envUrl.replace(/\/+$/, "");
    }
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin.replace(/\/+$/, "");
    }
    return "";
  }, []);

  useEffect(() => {
    if (shareBaseUrl) {
      console.log("[share] shareBaseUrl resolved", shareBaseUrl);
    }
  }, [shareBaseUrl]);

  useEffect(() => {
    console.log("[wallet] address state", address);
  }, [address]);

  const shareMintToFarcaster = useCallback(
    async ({
      displayTokenId,
      embedFid,
      txHash,
    }: {
      displayTokenId: number;
      embedFid: number;
      txHash: string | null;
    }) => {
      if (!displayTokenId || !embedFid) {
        console.warn("[share] Missing tokenId/embedFid", { displayTokenId, embedFid });
        return;
      }
      if (txHash && shareTxHashRef.current === txHash) {
        return;
      }
      if (!shareBaseUrl) {
        console.warn("[share] Missing NEXT_PUBLIC_URL, cannot compose cast");
        setShareError("Missing NEXT_PUBLIC_URL for share embeds.");
        return;
      }
      if (!isFarcasterSdkReady) {
        console.warn("[share] Farcaster Mini App SDK not ready");
        setShareError("Farcaster SDK not ready yet.");
        return;
      }
      setShareError(null);
      try {
        const shareUrl = `${shareBaseUrl}/share-mint/${embedFid}`;
        const shareText =
          `♻️ I just transformed my Warplet into a Buttlet #${displayTokenId}\n` +
          `🍑 Transform and mint yours 🍑\n` +
          `Only 0.00037 ETH`;
        console.log("[share] invoking composeCast", {
          displayTokenId,
          embedFid,
          shareUrl,
          txHash,
        });
        await farcasterMiniAppSdk.actions.composeCast({
          text: shareText,
          embeds: [shareUrl],
        });
        console.log("[share] composeCast completed", { displayTokenId, embedFid, shareUrl });
        if (txHash) {
          shareTxHashRef.current = txHash;
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to compose Farcaster cast";
        setShareError(message);
        console.error("[share] composeCast failed", error);
      } finally {
        // no-op
      }
    },
    [isFarcasterSdkReady, shareBaseUrl]
  );

  const handleShareClick = useCallback(() => {
    if (!userFid) {
      setShareError("Missing user fid");
      return;
    }
    const embedFid = Number(userFid);
    const displayTokenId = mintedTokenId ?? embedFid;
    void shareMintToFarcaster({
      displayTokenId,
      embedFid,
      txHash: mintTxHash,
    });
  }, [userFid, mintedTokenId, mintTxHash, shareMintToFarcaster]);

  const handleAddMiniApp = useCallback(async () => {
    if (!isFarcasterSdkReady) {
      setAddMiniAppError("Farcaster SDK not ready.");
      return;
    }
    setIsAddingMiniApp(true);
    setAddMiniAppError(null);
    try {
      await farcasterMiniAppSdk.actions.addMiniApp();
      console.log("[addMiniApp] User added The Buttlets to their apps");
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err?.name === "RejectedByUser") {
        setAddMiniAppError(null);
        return;
      }
      if (err?.name === "InvalidDomainManifestJson") {
        setAddMiniAppError("App domain must match manifest. Deploy to your production domain.");
        return;
      }
      const message = err?.message ?? "Could not add app";
      setAddMiniAppError(message);
      console.error("[addMiniApp] failed", error);
    } finally {
      setIsAddingMiniApp(false);
    }
  }, [isFarcasterSdkReady]);

  const handleTransform = useCallback(async () => {
    if (!userFid) {
      setTransformError("Missing user fid");
      return;
    }
    setIsTransforming(true);
    setTransformError(null);
    try {
      const res = await fetch("/api/warplet/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: userFid }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = payload?.error || `Transform failed (${res.status})`;
        throw new Error(message);
      }
      setTransformedCid(payload.cid);
      setTransformedImageUrl(payload.gatewayUrl ?? payload.imageUrl ?? `ipfs://${payload.cid}`);
      setTransformImageToken(Date.now().toString());
      setWarpletStatus((prev) => ({
        fid: userFid,
        hasTransformed: true,
        hasMinted: prev?.hasMinted ?? false,
        owner: prev?.owner ?? null,
        transform: {
          cid: payload.cid,
          gatewayUrl: payload.gatewayUrl ?? null,
          imageUrl: payload.gatewayUrl ?? payload.imageUrl ?? null,
          createdAt: payload.createdAt ?? new Date().toISOString(),
        },
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Transform failed";
      setTransformError(message);
    } finally {
      setIsTransforming(false);
    }
  }, [userFid]);

  useEffect(() => {
    if (!isTransforming) {
      setTransformStepIdx(null);
      return;
    }
    setTransformStepIdx(0);
    const stepInterval = setInterval(() => {
      setTransformStepIdx((prev) => {
        const current = prev ?? 0;
        return (current + 1) % TRANSFORM_MESSAGES.length;
      });
    }, 1800);
    return () => clearInterval(stepInterval);
  }, [isTransforming]);

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  useEffect(() => {
    let cancelled = false;
    async function ensureFarcasterReady() {
      if (typeof window === "undefined") {
        return;
      }
      try {
        await farcasterMiniAppSdk.actions.ready();
        if (!cancelled) {
          setIsFarcasterSdkReady(true);
          console.log("[share] Farcaster Mini App SDK ready");
        }
      } catch (error) {
        console.warn("[share] Unable to ready Farcaster Mini App SDK", error);
      }
    }
    ensureFarcasterReady();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !isFarcasterSdkReady ||
      clientAdded ||
      hasAutoPromptedAddMiniAppRef.current
    ) {
      return;
    }
    hasAutoPromptedAddMiniAppRef.current = true;
    setIsAddingMiniApp(true);
    setAddMiniAppError(null);
    farcasterMiniAppSdk.actions
      .addMiniApp()
      .then(() => {
        console.log("[addMiniApp] User added The Buttlets to their apps");
      })
      .catch((error: unknown) => {
        const err = error as { name?: string; message?: string };
        if (err?.name === "RejectedByUser") {
          setAddMiniAppError(null);
          return;
        }
        if (err?.name === "InvalidDomainManifestJson") {
          setAddMiniAppError(
            "App domain must match manifest. Deploy to your production domain."
          );
          return;
        }
        setAddMiniAppError(err?.message ?? "Could not add app");
        console.error("[addMiniApp] auto-prompt failed", error);
      })
      .finally(() => {
        setIsAddingMiniApp(false);
      });
  }, [isFarcasterSdkReady, clientAdded]);

  useEffect(() => {
    const fid = userFid;
    if (!fid) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/warplet/${fid}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) {
            setWarpletImage(null);
            setWarpletError(`No Warplet found for FID ${fid}`);
            return;
          }
          throw new Error(`Failed to fetch Warplet (${res.status})`);
        }
        const data: { image: string } = await res.json();
        if (!cancelled) {
          setWarpletError(null);
          setWarpletImage(data.image);
        }
      } catch (error) {
        console.error("[warplet] fetch failed", error);
        if (!cancelled) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          if (errorMessage.includes("404") || errorMessage.includes("No Warplet")) {
            setWarpletImage(null);
            setWarpletError(`No Warplet found for FID ${fid}`);
          } else {
            // For other errors, still set error but don't clear warpletImage if it was previously set
            setWarpletError(`Failed to load Warplet: ${errorMessage}`);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userFid, warpletImageReloadToken]);

  useEffect(() => {
    const fid = userFid;
    if (!fid) return;
    let cancelled = false;
    (async () => {
      try {
        console.log("[UI] Fetching Neynar profile", { fid });
        const res = await fetch(`/api/user/${fid}`, { cache: "no-store" });
        console.log("[UI] Neynar profile status", res.status);
        if (!res.ok) {
          const text = await res.text();
          console.warn("[UI] Neynar profile error body", text);
          return;
        }
        const data: { fid: number; username?: string; pfpUrl?: string | null } =
          await res.json();
        console.log("[UI] Neynar profile data", data);
        if (!cancelled) {
          setProfileUsername(data.username ?? null);
          setProfilePfpUrl(data.pfpUrl ?? null);
        }
      } catch {
        // ignore, we'll fallback to MiniKit context username
        console.error("[UI] Neynar profile fetch failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userFid]);

  return (
    <div className={styles.container}>
{/*       <header className={styles.headerWrapper}>
        
      </header> */}

      <div className={styles.content}>
        {displayedWarpletImage ? (
          // Use a regular img to avoid adding remote host to next/image config
          <div style={{ marginTop: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayedWarpletImage}
              alt={`Warplet for FID ${context?.user?.fid ?? ""}`}
              style={{ maxWidth: "100%", height: "auto", borderRadius: 0 }}
            />
          </div>
        ) : warpletError ? (
          <div style={{ marginTop: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/noWarplet.png"
              alt="No Warplet found fallback"
              style={{ maxWidth: "100%", height: "auto", borderRadius: 0 }}
            />
          </div>  
        ) : isStatusLoading ? (
          <p style={{ marginTop: 0 }}>Loading Warplet...</p>
        ) : null}

        <h1 className={styles.title} style={{ marginTop: 0 }}>🍑 The Buttlets 🍑</h1>
        <p style={{ marginTop: 0, textAlign: "center", fontSize: "17px" }}>
           Rotate your Warplet to show its Buttlet 🍑.</p>
        {context?.user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 0 }}>
            <span style={{ margin: 6 }}>
              <strong>@{profileUsername ?? context.user.username}</strong>
            </span>
            {displayPfpUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayPfpUrl}
                alt={`@${profileUsername ?? context.user.username} pfp`}
                width={32}
                height={32}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            ) : null}
            <span style={{ margin: 6 }}>
              fid <strong>{context.user.fid}</strong>
            </span>
          </div>
        ) : (
          <p style={{ marginTop: 4 }}>User context unavailable. Open inside a Farcaster Mini App.</p>
        )}
          {isFarcasterSdkReady && !clientAdded ? (
            <div style={{ marginTop: 8, marginBottom: 4, width: "100%" }}>
              <button
                type="button"
                onClick={handleAddMiniApp}
                disabled={isAddingMiniApp}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #6A3CFF",
                  background: "transparent",
                  color: "#6A3CFF",
                  fontWeight: 600,
                  cursor: isAddingMiniApp ? "wait" : "pointer",
                  opacity: isAddingMiniApp ? 0.7 : 1,
                  width: "100%",
                  fontSize: 14,
                }}
              >
                {isAddingMiniApp ? "Adding…" : "Add The Buttlets to my apps"}
              </button>
              {addMiniAppError ? (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#c00", textAlign: "center" }}>
                  {addMiniAppError}
                </p>
              ) : null}
            </div>
          ) : null}
          <p style={{ margin: 6, textAlign: "center", fontSize: "14px" }}>
          Limited to FIDs with a minted Warplet.
        </p>
        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 2, marginBottom: 10, flexDirection: "column", alignItems: "center" }}>
          {!address ? (
            <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
              Connect your wallet above to mint.
            </p>
          ) : null}
          {canTransform ? (
            <button
              onClick={handleTransform}
              disabled={!canTransform}
              style={{
                padding: "8px 8px",
                borderRadius: 8,
                border: "none",
                background: "#ff7f50",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                opacity: isTransforming ? 0.7 : 1,
                width: "100%",
              }}
            >
              {isTransforming ? "Transforming..." : "Transform"}
            </button>
          ) : !warpletStatus?.hasMinted && warpletStatus?.hasTransformed ? (
            <p style={{ margin: 0, fontSize: 14, color: "#2ecc71" }}>
              Warplet has been transformed into a Buttlet. Proceed to mint!
            </p>
          ) : null}
          {warpletStatus?.hasMinted && warpletStatus?.hasTransformed ? (
            <>
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  gap: 8,
                  marginTop: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {viewTokenLink ? (
                  <a
                    href={viewTokenLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "#6c5ce7",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: 600,
                      flex: "1 1 140px",
                      textAlign: "center",
                    }}
                  >
                    View Buttlet on OpenSea
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={handleShareClick}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 600,
                    flex: "1 1 140px",
                    cursor: "pointer",
                  }}
                >
                  Share Mint
                </button>
              </div>
              {shareError ? (
                <p style={{ color: "red", textAlign: "center", marginTop: 6 }}>
                  {shareError}
                </p>
              ) : null}
            </>
          ) : null}
          {transformError ? (
            <p style={{ color: "red", textAlign: "center", marginTop: 8 }}>
              {transformError}
            </p>
          ) : null}
          {!warpletStatus?.hasMinted && !transformedCid ? (
            <p style={{ margin: 0, fontSize: 13, color: "#777", textAlign: "center" }}>
              Transform your Warplet to enable minting.
            </p>
          ) : null}
          {!warpletStatus?.hasMinted && warpletStatus?.hasTransformed ? (
            <>
              <Transaction
                calls={transactionCalls}
                chainId={CHAIN_ID}
                onError={(e) => {
                  console.error("[mint] error", e);
                  setMintError(e?.message || "Transaction failed");
                }}
                onSuccess={(res) => {
                  const h = res?.transactionReceipts?.[0]?.transactionHash;
                  if (h) setMintTxHash(h);
                  setMintError(null);
                  if (h) {
                    setLastModalTxHash((prev) => {
                      if (h !== prev) {
                        setIsMintModalOpen(true);
                        refreshStatus({ preserveTransform: true });
                        return h;
                      }
                      return prev;
                    });
                  }
                  if (userFid) {
                    const embedFid = Number(userFid);
                    const displayTokenId = mintedTokenId ?? embedFid;
                    void shareMintToFarcaster({
                      displayTokenId,
                      embedFid,
                      txHash: h ?? null,
                    });
                  }
                }}
              >
                <TransactionButton text="Mint Buttlet" disabled={!canMint} />
              </Transaction>
              {mintError ? (
                <p style={{ color: "red", textAlign: "center", marginTop: 8 }}>{mintError}</p>
              ) : null}
            </>
          ) : null}
        </div>
        {isTransforming ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 900,
              padding: 16,
            }}
          >
            <div
              style={{
                background: "#fff",
                color: "#111",
                borderRadius: 12,
                padding: 24,
                width: "100%",
                maxWidth: 360,
                textAlign: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              <div className={styles.spinner} style={{ margin: "0 auto" }} />
              <p style={{ marginTop: 16, fontSize: 15, fontWeight: 600 }}>
                {TRANSFORM_MESSAGES[transformStepIdx ?? 0]}
              </p>
              <p style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
                We are transforming your Warplet, it make take a few minutes, be patient.<br />
                A Warplet can only be rotated once.<br />
                You can close the app, we will refresh with your Buttlet once it has been rotated.
              </p>
            </div>
          </div>
        ) : null}

        {isMintModalOpen ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={handleMintModalClose}
          >
            <div
              style={{
                background: "#fff",
                color: "#111",
                borderRadius: 12,
                padding: 16,
                width: "92%",
                maxWidth: 420,
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Mint completed</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Defer closing to avoid click-through on underlying elements
                    setTimeout(() => handleMintModalClose(), 0);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ marginTop: 12 }}>
                {modalImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={modalImage}
                    alt={`Minted Warplet ${mintedTokenId ?? ""}`}
                    style={{ width: "100%", maxWidth: 280, height: "auto", borderRadius: 8, display: "block", margin: "0 auto" }}
                  />
                ) : null}
                <div style={{ marginTop: 12, fontSize: 14, wordBreak: "break-all" }}>
                  <div>
                    <strong>Token ID:</strong> {mintedTokenId ?? "-"}
                  </div>
                  <div>
                    <strong>Tx Hash:</strong>{" "}
                    {mintTxHash ? (
                      <a
                        href={`${TX_EXPLORER_BASE_URL}/${mintTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {mintTxHash}
                      </a>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
                {viewTokenLink ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 16,
                      justifyContent: "center",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <a
                      href={viewTokenLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "#6c5ce7",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: 14,
                      }}
                    >
                      View Buttlet on OpenSea
                    </a>
                  </div>
                ) : null}
                {shareError ? (
                  <p style={{ color: "red", textAlign: "center", marginTop: 8 }}>
                    {shareError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          <Wallet>
  <ConnectWallet>
    <Avatar className="h-6 w-6" />
    <Name />
  </ConnectWallet>
  <WalletDropdown>
    <Identity
      className="px-4 pt-3 pb-2"
      hasCopyAddressOnClick
    >
      <Avatar />
      <Name />
      <Address />
      <EthBalance />
    </Identity>
    <WalletDropdownBasename />
    <WalletDropdownLink
      icon="wallet"
      href="https://keys.coinbase.com"
    >
      Wallet
    </WalletDropdownLink>
    <WalletDropdownFundLink />
    <WalletDropdownDisconnect />
  </WalletDropdown>
</Wallet>
        </div>

      </div>
    </div>
  );
}
