# Okiynai Editor Example

## Why This Exists

Mainly to share the approach and decisions behind this editor setup.

People can run it and test it, but the bigger point is to look through the code and get ideas for:
- editor architecture
- parent/iframe communication
- node-based page editing flows
- practical UI builder patterns

References:
- Okiynai: https://okiynai.com
- OSDL: https://github.com/okiynai/osdl

## What You’ll Find Here

- Editor shell UI (panels, controls, page tools)
- Iframe renderer sandbox
- Message-based interaction between parent and iframe (`postMessage`)
- OSDL core integration under `packages/osdl/core`
- Prebuilt section examples under `src/prebuilt-sections`
- Default demo page under `src/osdl-demos/default-demo.ts`

## Project Layout

- `src/app/shop-manager/website/edit/[sessId]`
  Parent editor UI and orchestration
- `src/app/shop-manager/website/edit/iframe`
  Renderer sandbox and mutation handlers
- `packages/osdl/core`
  OSDL core used by the editor

## Run Locally

Requirements:
- Bun 1.1+

```bash
bun install
bun dev
```
