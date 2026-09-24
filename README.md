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

## Mock data

Reality Defender is not connected yet. The interface runs on fixtures and bundled samples through a mock scan service; nothing is uploaded. Open `/mock` for links to every state and to every verdict for every media type.

## Documentation

- `CLAUDE.md`: working rules (architecture, security, visual, accessibility).
- `docs/architecture.md`: architecture and decision log.
- `progress.md`: completed stages, remaining work, open questions.
- `design/handoff/HANDOFF.md`: approved design specification.
