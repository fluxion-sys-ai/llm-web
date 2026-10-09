# LLM frontend development

Use Bun and a current Node.js installation, then run from `web/`:

```sh
bun install --frozen-lockfile
bun run dev:preview
```

Open http://localhost:3210. The preview serves reference model metadata,
illustrative usage and an ordinary sample user from a loopback-only fixture server. Open
Playground to try a simulated streaming reply. Use the Sign in page with the
local demo username `preview` and password `preview123`. These published demo
credentials are only for this fixture; do not enter any real account password.

The preview starts signed out. Signing in creates an in-memory session lasting
one hour, and signing out clears it. Restarting the preview also clears sessions.
Registration is unavailable in this local fixture.
The visible preview notice distinguishes this from a connected deployment.
Keys, payments and account changes are unavailable; no live services are called.

The local catalog in `scripts/preview-catalog.mjs` lists these models in order,
with the first three featured. Metadata was checked against the following
official OpenRouter pages on **2026-10-08**:
These links document internal research only; the public model details do not display them or imply that OpenRouter supplies Fluxion services.

| Model               | Reference                                                        |
| ------------------- | ---------------------------------------------------------------- |
| GLM 5.3             | [OpenRouter](https://openrouter.ai/z-ai/glm-5.3)                 |
| GLM 5.3 Flash       | [OpenRouter](https://openrouter.ai/z-ai/glm-5.3-flash)           |
| DeepSeek V4.1 Flash | [OpenRouter](https://openrouter.ai/deepseek/deepseek-v4.1-flash) |
| Qwen3.8 Flash       | [OpenRouter](https://openrouter.ai/qwen/qwen3.8-flash)           |
| Kimi K3             | [OpenRouter](https://openrouter.ai/moonshotai/kimi-k3)           |
| Qwen3.8 27B         | [OpenRouter](https://openrouter.ai/qwen/qwen3.8-27b)             |

Context and maximum output values are limits reported by the OpenRouter
aggregate catalog, not guaranteed limits of any deployed Fluxion channel.
Capabilities and limits can differ across providers and change over time.
GLM 5.3 Flash reasoning support is also documented by OpenRouter's
[GLM Flash Latest alias](https://openrouter.ai/~z-ai/glm-flash-latest), which
resolved to GLM 5.3 Flash when checked. The fixture does not specify its
reasoning defaults or effort levels.

Fluxion prices are **not configured**: each model has `pricing_status: 'pending'`.
Required ratio fields contain zero only for API compatibility; they do not mean
free usage. OpenRouter prices are not copied into Fluxion pricing. Short model
IDs are local catalog identifiers and do not mean a provider is connected.
Playground calls remain simulated and unbilled, dashboard usage is illustrative,
and measured model performance is empty. The catalog and selectable model API
share the same data, without fetching OpenRouter at runtime.

The preview fixture script is a development tool, not part of the production
frontend bundle. Existing authentication and API implementations are unchanged.
Stop with Ctrl+C. For a separately configured development backend, use the normal
`bun run dev` command with `VITE_REACT_APP_SERVER_URL`; that command does not use
the fixtures. `bun run build` builds the frontend without the preview notice.

Validation:

```sh
bun run typecheck
bun run test:preview
node --test scripts/__tests__/catalog.test.mjs
bun run build
```

The `llm-web` changes focus the existing New API UI on text-model workflows.
Existing backend module permissions continue to apply; hidden navigation is
presentation only and does not disable server endpoints.

The fixture follows the relevant session-lifecycle guidance in the
[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
and [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html):
random server-owned session cookies, an HttpOnly session cookie, SameSite=Lax,
absolute expiry, and server-side logout invalidation. The separate readable
cookie only hints that a session may exist; it does not authenticate requests.
This is a local HTTP simulation with published demo credentials, not a production
authentication implementation or an ASVS compliance claim. Credentials and
session cookie values are never logged. The preview tests exercise the fixture
through loopback HTTP without launching Rsbuild.

## Visual theme

The default UI follows the Fluxion video site Pro theme: Geist for interface text, JetBrains Mono for code and numeric values, and Sora for the Fluxion wordmark. The site stays in light mode with neutral surfaces, black primary buttons, and restrained indigo accents. Theme Settings and theme-switching controls are removed. Saved dark/system, palette, font, radius, scale, and layout preferences are cleared so all pages use the same Fluxion styling. Model logos retain their original brand colors. Font assets are bundled locally through Fontsource; viewing the site does not request fonts from a third-party CDN.

TanStack Router and Query developer panels are hidden in `dev:preview` so they do not cover the interface or conflict with modal dialogs. They remain available in regular development mode.

The homepage layout follows the video site Pro landing: a centered hero with two actions, a pale blue engine animation, three featured models from the shared catalog, a split API integration section, a closing call to action, and a navigation footer. Model cards open their existing detail route. The public header stays at 56px rather than shrinking while scrolling.

The hero illustrates a specialized inference engine for every model–GPU pair. GPU and LLM lists scroll, lock a selection, and merge into a Personalized Engine over a 10.2-second loop. Each pair has its own tile pattern. The diagram stacks vertically on phones, offers a keyboard-accessible pause control, and initially shows a settled result when reduced motion is enabled. It pauses when offscreen or the browser tab is hidden. This is a frontend illustration, with no provisioning, benchmark, or model API calls.

The shared `src/components/ui/carousel.tsx` handles user-controlled slides, while `src/features/home/components/hero-terminal-demo.tsx` cycles terminal text. Neither expresses synchronized reel locking and connector geometry, so these live in the dedicated `src/features/home/components/engine-animation/` feature. Its playback control reuses the shared Button, with custom animation styles scoped in `src/styles/engine-animation.css`.

The public Models navigation opens a dropdown with the full catalog link and individual model details. It shares the pricing query and original model icons, and becomes an inline expandable group on mobile. Language selection lives inside the user dropdown rather than in the public or console header; the profile page keeps its language preferences card.

Shared controls now follow the same Pro design system across marketing pages, account forms, the console and Playground: a 1440px page column with 24px gutters, 56px headers, 8px controls, 12px bordered cards, 6px tags and neutral hover surfaces. Primary buttons are black; indigo is reserved for links, focus and selected accents. Default controls are 36px tall and large actions are 42px. Cards stay flat, and tables no longer animate each row or override the typography of numeric cells. Sign-in and other account forms share the public header and footer. Authentication, billing and model access behavior is unchanged by this visual pass.

## GPU catalog

The public `/gpu` page and GPU navigation use the local catalog in `src/features/gpu/data.ts`. The layout references [YottaLabs GPU pods](https://console.yottalabs.ai/compute/pods/deploy), with all RTX entries excluded. The six entries are A100 PCIe 80G, H100, A100 80G, H200, B200 and B300. GPU and Models menus share the same desktop dropdown and mobile expandable navigation component.

GPU selections can be linked with `/gpu?gpu=h200`. The configuration dialog only previews GPU count, workload and aggregate memory. It does not allocate resources, connect to a provider, or charge an account. Aggregate memory is the sum across GPUs, not a promise of a single pooled address space. RAM, vCPU allocations, pricing and availability remain unconfigured; reference-provider prices and stock are not copied.

Nominal per-GPU memory was checked on 2026-10-08 using [NVIDIA A100](https://www.nvidia.com/en-us/data-center/a100/), [NVIDIA H100](https://www.nvidia.com/en-us/data-center/h100/), [NVIDIA HGX H100/H200/B200 specifications](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory-h100-h200-b200/latest/components.html), and [NVIDIA DGX B300 specifications](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html). B300 shows the official 288 GB specification; the reference provider's 262 GB listing has not been verified as a hardware capacity or available-memory guarantee. No A100 form factor is inferred for the entry that does not explicitly say PCIe.

## Pricing and resources

The independent Pricing tab opens `/pricing/overview`, with LLM API and GPU compute comparison tables. Model prices reuse the existing catalog query and billing components, including pending and dynamic billing states. GPU hourly prices remain unconfigured. Existing Models links retain `/pricing` and `/pricing/<modelId>`; the new static overview route has priority over model detail matching and follows the existing pricing module access checks.

Resources groups Blog (`/blog`) and Docs (`/docs`) in the shared desktop/mobile catalog menu. The docs item still respects `HeaderNavModules.docs`; the blog contains an explicit coming-soon state until editorial content is supplied. No articles, author identities or publication dates are fabricated.
