## 🍑 The Buttlets 🍑

🍑 The Buttlets 🍑 is a Farcaster Mini App that lets every user reinterpret their Warplet (NFT bound 1:1 to their fid) using AI, upload the new image to IPFS (Pinata), and mint it on Base. Current capabilities:

- Automatically detect whether the visiting fid already owns the original Warplet.
- Display the Warplet image plus basic profile info (username, pfp, fid).
- Provide a mint flow (running in test mode right now) with a confirmation modal, tx hash, token id, and sharing shortcuts.
- Upcoming work: call Google Gemini to reimagine the Warplet, upload the output to Pinata, and mint that image on-chain.

---

## Architecture

| Layer | Stack / Notes |
| ----- | ------------- |
| **Frontend** | Next.js (App Router) + React + CSS Modules. Onchain UX with `@coinbase/onchainkit` (MiniKit for Farcaster context, TransactionButton for txs). |
| **Client state** | React hooks (`useState`, `useMemo`, `useEffect`). MiniKit context supplies the authenticated fid. |
| **Backend / API Routes** | Next.js route handlers under `app/api/**`: `warplet/[fid]`, `user/[fid]`, `mint/sign`. Planned additions: `warplet/reinterpret`, Pinata upload proxy. |
| **On-chain** | `amgWarplets.sol` (ERC-721 Enumerable, tokenId=fid, one mint per wallet, mint price 0.00037 ETH) currently on Base Sepolia. `viem` powers RPC reads/signing. |
| **Infra & services** | Base RPC (public or custom via `BASE_RPC_URL`), Neynar for social data, Pinata for IPFS storage, Google Gemini (planned) for image reinterpretation. |

---

## Services & Integrations

- **Farcaster MiniKit** – exposes fid/username/pfp inside the Mini App.
- **Neynar API** – `/api/user/[fid]` enriches the profile card.
- **Base RPC + viem** – `/api/warplet/[fid]` reads the legacy Warplet collection on Base mainnet.
- **Pinata** – existing API uploads images and provides CID + gateway URL (reused for the AI output).
- **Google Gemini** – forthcoming step to reinterpret the Warplet image before minting.
- **Coinbase OnchainKit** – wallet connection, transaction orchestration, Mini App UX.
- **Neon Postgres** – lightweight table `clawplet_warplets` that tracks `{ fid, cid, gatewayUrl }` so each user can transform exactly once.

---

## Current APIs

| Endpoint | Purpose |
| -------- | ------- |
| `GET /api/warplet/[fid]` | Reads the original Warplet NFT (Base mainnet), normalizes IPFS → HTTP, returns `{ tokenId, tokenUri, image }`. |
| `GET /api/user/[fid]` | Neynar proxy returning `{ fid, username, pfpUrl }`. |
| `POST /api/mint/sign` | Produces the EIP-191 signature required by `clawplets.mint`. Uses server envs (`VERIFIER_PRIVATE_KEY`, `CONTRACT_ADDRESS`, `CHAIN_ID`). |
| `POST /api/warplet/transform` | Validates fid, sends the Warplet image to Gemini, uploads the crochet result to Pinata, stores `{ fid, cid }` in Neon, and returns `{ cid, gatewayUrl }`. |
| `GET /api/warplet/status` | Aggregates Neon + on-chain data to answer `hasTransformed`, `hasMinted`, `owner`. |
| `POST /api/ipfs/upload-image` | JSON or multipart upload helper that pushes images to Pinata and returns `{ cid, gatewayUrl }`. |

---

## Current User Flow

1. Mini App retrieves the user’s fid via MiniKit.
2. `GET /api/warplet/[fid]` fetches and shows their original Warplet (or a “not found” fallback).
3. The page displays profile info plus a “Mint Warplet” button (currently test mode with random fid + fixed CID).
4. Mint sequence:
   - Client asks `/api/mint/sign` for the authorization signature.
   - OnchainKit sends the transaction to Base Sepolia.
   - Modal shows tx hash, token id, preview, and buttons to share on Farcaster or open OpenSea.

> Next milestone: swap the placeholder fid/CID with the actual Gemini + Pinata output so users mint their customized Warplet.

---

## Environment Variables

| Variable | Scope | Description |
| -------- | ----- | ----------- |
| `CONTRACT_ADDRESS` | Server | Address of the `amgWarplets` contract receiving mints. |
| `CHAIN_ID` | Server | Target chain (e.g., `84532` for Base Sepolia). |
| `VERIFIER_PRIVATE_KEY` | Server | Private key that signs mint authorizations (must include `0x`). |
| `BASE_RPC_URL` | Server (optional) | Custom RPC for `tokenURI` reads. Defaults to `https://mainnet.base.org`. |
| `IPFS_GATEWAY` | Server (optional) | HTTP gateway for resolving IPFS URIs. |
| `PINATA_JWT` | Server | Credential for uploading to Pinata. |
| `PINATA_GATEWAY` | Server/Client (optional) | Custom gateway to serve CIDs. |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Client | Contract address used when building the mint transaction. |
| `NEXT_PUBLIC_CHAIN_ID` | Client | Chain ID for OnchainKit transactions. |
| `NEXT_PUBLIC_IPFS_GATEWAY` | Client | Gateway to display images in the UI/modal. |
| `NEYNAR_API_KEY` | Server | Required for `/api/user/[fid]`. |
| `GEMINI_API_KEY` | Server | Credential to call Google Gemini for reinterpretation. |
| `DATABASE_URL` / `NEON_DATABASE_URL` | Server | Connection string for the Neon table `crochet_warplets`. |
| `MINT_RPC_URL` | Server (optional) | Override RPC endpoint for checking minted status; defaults to Base mainnet/Sepolia depending on `CHAIN_ID`. |

> Keep secrets on the server only. Any `NEXT_PUBLIC_*` variable is exposed to the client bundle.

---

## Local Development

```bash
# 1. Install deps
npm install

# 2. Copy env template and fill values
cp .env.example .env.local

# 3. Start dev server
npm run dev

# 4. Open http://localhost:3000 (Farcaster Mini App DevTools or browser)
```

> To test the mint you need a Base Sepolia wallet funded with test ETH, plus valid `CONTRACT_ADDRESS` / `CHAIN_ID` and `VERIFIER_PRIVATE_KEY` in your env.

---

## Roadmap

- Wire up the real mint flow:
  - Generate the reinterpretation with Gemini using the user’s existing Warplet image.
  - Upload the result to Pinata and capture the CID.
  - Mint using the actual fid + CID combo (signature + on-chain tx).
- Cache reinterpretations per fid to avoid unnecessary Gemini calls.
- Add an endpoint to read newly minted NFTs from `CONTRACT_ADDRESS` (Base Sepolia/Mainnet) and refresh the UI post-mint.

---

## References

- [OnchainKit Docs](https://docs.base.org/onchainkit)
- [Farcaster Mini Apps](https://docs.base.org/mini-apps)
- [Neynar API](https://docs.neynar.com/)
- [Pinata SDK](https://docs.pinata.cloud/)
- [Google Gemini API](https://ai.google.dev/gemini-api)
