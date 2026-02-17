const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  accountAssociation: {
    "header": "eyJmaWQiOjIwNzAxLCJ0eXBlIjoiYXV0aCIsImtleSI6IjB4N2VFMEI2RWUwRUFjMzUxNzBGMzgxNjFiMTNjZGYxNjY5ZWE0ZTUzZSJ9",
    "payload": "eyJkb21haW4iOiJjcm9jaGV0d2FycGxldHMubWluaWFwcHMuem9uZSJ9",
    "signature": "kQZjU9zF1VFCiZJXzYB03wupuctMhG4bXQJ7ZcUQyHJYMUU0aCm0eW3Yux9wkXZYSurLdRwcsPNVJC8Hjj/ZBhw=",
  },
  baseBuilder: {
    ownerAddress: "0x58F521068A39a5e675ACc7Edd7E269f576867691",
  },
  miniapp: {
    version: "1",
    name: "🍑 The Buttlets 🍑",  
    subtitle: "Your Warplet into a Buttlet",
    description: "Transform your Warplet into a Buttlet",
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splashnt.png`,
    imageUrl: `${ROOT_URL}/launcher.png`,
    splashBackgroundColor: "#e9ca71",
    buttonTitle: "Transform your Warplet -> 🍑",
    homeUrl: ROOT_URL,
    webhookUrl: `https://api.neynar.com/f/app/0d58bc7c-a0ae-4d7d-8378-6c1b22c3aac1/event`,
    primaryCategory: "social",
    tags: [`warplet`, `pfp`, `farcaster`, `Buttlet`, `OpenClaw`],
    screenshotUrls: [
      `${URL}/ss_01.jpg`,
      `${URL}/ss_02.jpg`
 ],
 heroImageUrl: `${ROOT_URL}/launcher.png`,
 tagline: "Warplet to Buttlet",
 ogTitle: "Buttlets",
 ogDescription: "Transform your Warplet into a Buttlet",
 ogImageUrl: `${ROOT_URL}/hero.png`,
  },
} as const;
