# AGENTS.md — Fluxion LLM Web

DO NOT send optional commentary.

## Scope

This repository maintains the Fluxion LLM frontend on `main`. It is a modified frontend derived from [New API](https://github.com/QuantumNous/new-api). Application source, assets, build configuration and development tools live in `web/`. Backend source is maintained separately in `fluxion-sys-ai/new-api`; gateway configuration and deployment tools live in `fluxion-sys-ai/api-gateway`.

Use Bun as the package manager. The frontend uses React, TypeScript, Rsbuild, TanStack Router/Query/Table, Zustand, Base UI and Tailwind CSS.

## Frontend work

- Read and follow [web/AGENTS.md](web/AGENTS.md) before modifying frontend code. Refer to [README.llm-web.md](README.llm-web.md) for local preview, editing locations and deployment instructions.
- Before implementing or changing frontend UI, read the project [shadcn-ui skill](.agents/skills/shadcn-ui/SKILL.md), search `web/src/components/` and the relevant feature, and inspect matching implementations and call sites.
- Reuse shared business components before lower-level primitives. Evaluate existing props, composition and compatible extensions before introducing a replacement. A new implementation of common UI behavior needs a concrete capability gap explained in the change summary.
- Keep code direct and readable. Prefer clear branches, early returns and domain-specific names; avoid unnecessary helpers and duplicate behavior.
- All user-facing UI text must support i18n. Use `useTranslation()` and English source strings as translation keys. Before editing locale files or adding translation keys, follow the [i18n skill](.agents/skills/i18n-translate/SKILL.md); maintain all seven locales in `web/src/i18n/locales/`.
- Consult the [React best-practices skill](.agents/skills/vercel-react-best-practices/SKILL.md) when relevant to component design or performance.
- Preserve existing API and authentication contracts with the shared backend. Frontend visibility and validation do not replace server authorization or validation. Keep secrets out of client code and logs.
- For authentication changes, consult the applicable OWASP authentication and session-management guidance, and verify affected behavior with focused regression tests.

## Development and validation

Run commands from `web/`:

- `bun install --frozen-lockfile` installs the committed dependencies.
- `bun run dev:preview` starts a local fixture-backed preview; `bun run dev:backend` uses the separately configured backend tunnel.
- `bun run typecheck` checks TypeScript.
- `bun run test --maxWorkers=4` runs the frontend tests; `bun run test:preview` checks preview fixtures.
- `bun run build` produces `web/dist/`.

Follow `web/AGENTS.md` for affected-file lint, formatting, testing and browser verification. Report the checks actually completed and any failures. Keep frontend builds independent of files in another repository. Treat publishing as a separate action through the documented deployment tooling.

## License and upstream attribution

Preserve `LICENSE`, `NOTICE`, `THIRD-PARTY-LICENSES.md`, copyright headers and required third-party notices. Keep the visible notice “Frontend design and development by New API contributors.” and a prominent link to https://github.com/QuantumNous/new-api as required by `NOTICE`. Identify this repository as a modified frontend and do not misrepresent its upstream origin.
