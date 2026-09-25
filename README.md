# Faike

Faike tells people how likely it is that a photo, voice note, video, piece of text or social-media link was generated or manipulated by AI, using Reality Defender for detection.

## Getting started

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route type generation and TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |

## Environment

Copy `.env.example` to `.env.local` and set the Reality Defender API key. Both variables are read only on the server; never prefix them with `NEXT_PUBLIC_`.

| Variable | Purpose |
|---|---|
| `REALITY_DEFENDER_API_KEY` | RD API key (server only) |
| `REALITY_DEFENDER_API_BASE_URL` | RD API base URL, `https://api.prd.realitydefender.xyz` |
| `REALITY_DEFENDER_LOG_AGGREGATION_SHAPE` | Optional development aid. `1` logs the structure (keys, types, array lengths, numeric ranges; no values) of RD's `aggregation.json` for each finished check. Leave unset in production. |

## Mock data and configuration

Every check you start (photo, audio, video, text file, pasted text or social link) is a real Reality Defender check through the routes under `/api/scans` (see `docs/architecture.md` §5), which need the variables above. The browser uploads files to Reality Defender through a temporary same-origin route (`/rd-upload`, forwarded by a rewrite in `next.config.ts`), because RD's upload server does not yet allow Faike's origins; switch it off in `src/config/upload.ts` once it does (`progress.md`). Which kinds are offered is set in `src/config/capabilities.ts`; limits and formats in `src/config/media.ts`. Open `/mock` for links to every state and to every verdict for every media type; those links always use fixtures and bundled samples.

## Documentation

- `CLAUDE.md`: working rules (architecture, security, visual, accessibility).
- `docs/architecture.md`: architecture and decision log.
- `progress.md`: completed stages, remaining work, open questions.
- `design/handoff/HANDOFF.md`: approved design specification.
