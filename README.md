# Fluxion LLM Web

Standalone frontend for Fluxion LLM, maintained on the `main` branch. This modified frontend is based on [New API](https://github.com/QuantumNous/new-api) by QuantumNous and contributors.

The application lives in `web/` and uses React, TypeScript, Tailwind CSS and Rsbuild. Live deployments use the existing shared backend. Backend source is maintained in `fluxion-sys-ai/new-api`; gateway configuration and deployment tools live in `fluxion-sys-ai/api-gateway`.

## Local preview

Install Bun and the Node.js version in `web/.node-version`, then run:

```sh
cd web
bun install --frozen-lockfile
bun run dev:preview
```

Open `http://127.0.0.1:3210` and sign in with the local demo account `preview` / `preview123`. This mode uses sample data and simulated replies. For development against a configured backend, use the connection instructions in the [LLM website guide](README.llm-web.md).

## Checks and build

Run from `web/`:

```sh
bun run typecheck
bun run test --maxWorkers=4
bun run test:preview
bun run build
```

The production output is `web/dist/`. See [README.llm-web.md](README.llm-web.md) for page locations, editing guidance and deployment details. Publishing the static frontend is handled by the separate `api-gateway` repository; pushing to this repository does not deploy the website.

## License and attribution

Licensed under [AGPL-3.0](LICENSE), with additional attribution terms in [NOTICE](NOTICE). Preserve the copyright headers, [third-party notices](THIRD-PARTY-LICENSES.md), and the visible upstream attribution and project link when distributing this frontend.

Frontend design and development by New API contributors.
