import {
  http,
  cookieStorage,
  createConfig,
  createStorage,
} from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";

const appName = "The Buttlets";

// Builder Code from base.dev > Settings > Builder Code — attributes onchain activity
export const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_r3vf5o3d"],
});

export function getConfig() {
  return createConfig({
    chains: [base],
    connectors: [
      coinbaseWallet({
        appName,
        preference: "all",
        version: "4",
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(),
    },
    dataSuffix: DATA_SUFFIX,
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
