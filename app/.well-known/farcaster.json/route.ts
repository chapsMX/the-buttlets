/* import { withValidManifest } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "../../../minikit.config";

export async function GET() {
  return Response.json(withValidManifest(minikitConfig));
} */

  export async function GET() {
    const URL = process.env.NEXT_PUBLIC_URL;
  
    return Response.json({
      accountAssociation: {
      "header": "eyJmaWQiOjIwNzAxLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4ZDQwNDg2MjIwNDMzOWJCNDJDNWMzNTVjMzcxMWViYzE2MTM1ZjllZSJ9",
      "payload": "eyJkb21haW4iOiJjbGF3cGxldHMubWluaWFwcHMuem9uZSJ9",
      "signature": "/geYZrFm/5Dx66dHqlClAGG8nXmTyKr87jNaiQhXx+osPgvKy3J3Mfe2+vxUow8cuky2s8wE5R4tTUWS6SKe5xs=",
      },
      baseBuilder: {
        ownerAddress: "0x58F521068A39a5e675ACc7Edd7E269f576867691",
      },
      miniapp: {
        version: "1",
        name: "🦞 Clawplets 🦞",  
        subtitle: "Your Warplet in Clawplet",
        description: "Transform your Warplet into a Clawplet",
        iconUrl: `${URL}/icon.png`,
        splashImageUrl: `${URL}/splashnt.png`,
        imageUrl: `${URL}/launcher.png`,
        splashBackgroundColor: "#e9ca71",
        buttonTitle: "Transform your Warplet -> 🦞",
        homeUrl: URL,
        webhookUrl: `https://api.neynar.com/f/app/8bd3ba67-b0fb-488e-a7a2-aa98bffde018/event`,
        primaryCategory: "social",
        tags: [`warplet`, `pfp`, `farcaster`, `clawplet`, `OpenClaw`],
        screenshotUrls: [
          `${URL}/ss_01.jpg`,
          `${URL}/ss_02.jpg`
     ],
        heroImageUrl: `${URL}/launcher.png`,
        tagline: "Warplet to Clawplet",
        ogTitle: "Clawplets",
        ogDescription: "Transform your Warplet into a Clawplet",
        ogImageUrl: `${URL}/hero.png`,
      },
    });
  }