# Zhixia Wheel Watch

A read-only live dashboard for **Squeekchain** on Sepolia.

- Reads `SqueekCore.state()` for Squeek block height, progress to the next block, difficulty (`workPerThousandBlocks`), total wheel work and pause status.
- Reads `SqueekToken.totalSupply()` and `SqueekNFT.totalSupply()`.
- Wallet check: SQK balance and Squeeks held for any address (`balanceOf`).
- Next-block guess game: guess the minutes until the next Squeek block; scored in-browser when the height ticks over.

Pure static HTML + JS, no build step, no wallet connection. Contracts from https://docs.squeekchain.com/developers/#deployments.
Live at https://zhixiasqk.xyz
