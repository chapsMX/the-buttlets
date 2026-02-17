## 1) Overview

Warplets is a Next.js (App Router) Mini App scaffold tailored for Farcaster and the Base ecosystem. It aims to provide a clean starting point that:
- Integrates Coinbase OnchainKit for wallet, identity, and onchain UX components
- Supports Farcaster Mini App readiness and identity verification (Quick Auth)
- Uses modern React 19 and TypeScript with strict typing and Next.js best practices

Problem statements this project addresses:
- Bootstrapping a Farcaster Mini App with correct MiniKit readiness and Safe Area handling
- Verifying a Mini App user’s identity server-side via a JWT from Farcaster (Quick Auth)
- Providing a composable provider setup (OnchainKit + wagmi/viem) for future onchain actions

Core functionality:
- App shell using `SafeArea` and App Router layout
- OnchainKit provider configuration (API key, Base chain, appearance, MiniKit options)
- Farcaster Quick Auth endpoint (`/api/auth`) that validates the Authorization token and returns the user FID
- A minimal landing page that mounts the Wallet UI and signals Mini App readiness


## 2) Tech Stack (with versions)

- Framework: Next.js 15.3.4 (App Router)
- Language: TypeScript ^5
- UI Runtime: React ^19.0.0, React DOM ^19.0.0
- Onchain UX: @coinbase/onchainkit latest
- Farcaster
  - Mini App SDK: @farcaster/miniapp-sdk ^0.1.8
  - Quick Auth (server verification): @farcaster/quick-auth ^0.0.7 (dev dependency, used in API route)
- Web3 Client: wagmi ^2.16.3, viem ^2.31.6
- Data/Async: @tanstack/react-query ^5.81.5
- Linting: eslint ^9, eslint-config-next 15.3.4, @next/eslint-plugin-next ^15.3.4
- Build/Tooling: Next.js toolchain; TypeScript; flat ESLint config (`eslint.config.mjs`)


## 3) Project Structure

Top-level files and directories of interest:

- `app/`
  - `layout.tsx`: Root layout. Sets up fonts, wraps content with `SafeArea`, and provides metadata from `minikit.config.ts`.
  - `rootProvider.tsx`: Client provider that mounts `OnchainKitProvider` with your chain, API key, and MiniKit settings.
  - `page.tsx`: Client component home page. Renders the Wallet UI, demonstrates MiniKit readiness, and links to OnchainKit docs.
  - `globals.css`: Global styles (dark/light scheme, typography, code styles).
  - `page.module.css`: Local styles for the home page.
  - `api/auth/route.ts`: Next.js Route Handler for Farcaster Quick Auth token verification. Returns the user’s FID on success.

- `public/`
  - App assets: `icon.png`, `splash.png`, `hero.png`, `logo.png`, `sphere.svg`, etc.

- `minikit.config.ts`: Mini App manifest-like configuration used for metadata, assets, and URLs (e.g., `homeUrl`, `webhookUrl`, images).
- `next.config.ts`: Next config with a small webpack externals override (`pino-pretty`, `lokijs`, `encoding`).
- `tsconfig.json`: TypeScript config with strict mode, `bundler` module resolution, and path alias `@/*` → project root.
- `eslint.config.mjs`: Flat ESLint configuration extending Next.js rules with a specific `@typescript-eslint/no-unused-vars` setting.
- `package.json`: Scripts and dependencies.
- `README.md`: Basic usage and links to documentation.


## 4) Coding Standards

TypeScript
- Strict mode enabled (`"strict": true`)
- `moduleResolution: "bundler"` for Next.js 15 toolchain
- Path alias: import from `@/*` for root-based imports

React and Next.js
- App Router structure (`app/` directory)
- Use server vs client components thoughtfully; add `"use client"` only where needed (e.g., `page.tsx`, `rootProvider.tsx`)
- Co-locate route handlers under `app/api/*/route.ts`
- Favor composition with providers in `app/rootProvider.tsx`

Linting
- Base rules from `next/core-web-vitals` and `next/typescript`
- `@typescript-eslint/no-unused-vars`: error, with underscore-ignored args/vars (helps keep signatures stable while avoiding noise)
- Recommended: run `npm run lint` before committing

Styling
- Global styles in `app/globals.css`; component-scoped styles via CSS modules (e.g., `page.module.css`)
- OnchainKit ships its own styles; ensure `@coinbase/onchainkit/styles.css` is imported in the provider

Patterns and Guidelines
- Keep API route handlers small and focused (validate input, call services, return minimal JSON)
- Prefer explicit, descriptive names for variables/functions
- Avoid deep nesting; use guard clauses for clarity
- Only add comments for non-obvious reasoning, invariants, or important context


## 5) User Stories

- As a Farcaster Mini App user, I can open the app and see a clean landing screen that’s safe-area aware.
- As a user, I can connect my wallet via the OnchainKit Wallet UI.
- As a Mini App user, the app signals readiness to the host (MiniKit) so UI is interactive promptly.
- As an app developer, I can verify a Mini App user’s identity server-side by calling `/api/auth` (receiving a Farcaster ID on success).
- As a developer, I can configure the Mini App’s metadata, images, and URLs through `minikit.config.ts` and environment variables.


## 6) APIs and Integrations

Environment Variables
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY`: Required by `OnchainKitProvider` to enable OnchainKit functionality.
- `NEXT_PUBLIC_URL` / `VERCEL_URL` / `VERCEL_ENV`: Used for deriving absolute URLs and domain validation in auth.

OnchainKit Integration
- Provider: configured in `app/rootProvider.tsx`
  - `chain`: Base (from `wagmi/chains`)
  - `config.appearance.mode`: `"auto"`
  - `wallet.display`: `"modal"`; `wallet.preference`: `"all"`
  - `miniKit.enabled`: `true`; `miniKit.autoConnect`: `true`
- Components: `Wallet` is rendered on the home page, with other OnchainKit components referenced in documentation links.

MiniKit Readiness
- `useMiniKit()` in `app/page.tsx` calls `setMiniAppReady()` on mount when not already ready, ensuring the host treats the app as ready for interaction.

Farcaster Quick Auth Endpoint
- Route: `GET /api/auth`
- Auth: expects `Authorization: Bearer <jwt>` header (supplied by Farcaster Mini App SDK when fetching internally)
- Behavior:
  - Validates the token using `@farcaster/quick-auth`
  - Verifies the domain using request headers (`origin`/`host`) with fallbacks to env-derived URLs
  - Returns `200` with `{ userFid }` on success
  - Returns `401` with `{ message: "Missing token" | "Invalid token" }` on failures
  - Returns `500` with `{ message }` on unexpected errors

Mini App Manifest Configuration
- `minikit.config.ts` centralizes metadata used by the app and for Mini App manifest fields (name, description, images, `homeUrl`, `webhookUrl`, etc.).
- Note: `webhookUrl` references `/api/webhook` which is not implemented by default—add this route if your app needs a webhook.

Web3 Clients
- `wagmi` and `viem` are available for future onchain actions (transactions, reads, etc.), and are already compatible with OnchainKit’s provider setup.


