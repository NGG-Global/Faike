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

## Mock data

Photos are checked for real by Reality Defender through the routes under `/api/scans` (see `docs/architecture.md` §5), which need the variables above. The browser uploads the photo directly to Reality Defender, which currently works only once RD has added the site's origin to its CORS allow-list (`progress.md`). Audio, video, text and links still run on fixtures and bundled samples through a mock scan service. Open `/mock` for links to every state and to every verdict for every media type; those links always use the mock.

## Documentation

- `CLAUDE.md`: working rules (architecture, security, visual, accessibility).
- `docs/architecture.md`: architecture and decision log.
- `progress.md`: completed stages, remaining work, open questions.
- `design/handoff/HANDOFF.md`: approved design specification.
