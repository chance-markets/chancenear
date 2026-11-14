/** Asset ids and chain names shared by the server, the scenarios and the browser. Ids are real, from GET /v1/tokens. */
export const ASSETS = {
  USDC_BASE: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
  USDC_ARB: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
  USDC_NEAR: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  USDT_NEAR: "nep141:usdt.tether-token.near",
  WNEAR: "nep141:wrap.near",
  ETH: "nep141:eth.omft.near",
  BTC: "nep141:btc.omft.near",
} as const;

export const CHAIN_NAMES: Record<string, string> = {
  near: "NEAR", base: "Base", arb: "Arbitrum", eth: "Ethereum", sol: "Solana", btc: "Bitcoin", op: "Optimism",
  pol: "Polygon", bsc: "BNB Chain", avax: "Avalanche", tron: "Tron", ton: "TON", sui: "Sui", aptos: "Aptos",
  gnosis: "Gnosis", stellar: "Stellar", zec: "Zcash", hypercore: "Hyperliquid", starknet: "Starknet",
};
export const chainName = (c: string) => CHAIN_NAMES[c] ?? c;
