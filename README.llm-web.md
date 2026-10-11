# Fluxion LLM 网站修改指南

适用于 `llm-web` 分支。网站基于 New API，前端位于 `web/`，使用 React、TypeScript 和 Tailwind CSS。修改文案、页面和样式通常只需改前端。

## 1. 本地预览

安装 Bun，在本仓库的 `llm-web` 分支根目录运行：

```bash
cd web
bun install
bun run dev:preview
```

打开终端显示的地址，默认是 `http://127.0.0.1:3210`。登录预览账号：`preview` / `preview123`。

此模式使用模拟数据，不连接线上后端；修改保存后会自动刷新。预览账号不是线上账号。

## 2. 网站内容在哪里改

下表路径均相对于 `web/src/`。

| 要修改的内容 | 文件或目录 |
| --- | --- |
| 首页标题、副标题 | `features/home/components/sections/llm-hero.tsx` |
| 首页区块顺序、底部引导 | `features/home/index.tsx`、`features/home/components/sections/cta.tsx` |
| 首页推荐模型布局 | `features/home/components/sections/llm-featured-models.tsx` |
| 首页「AI 优化器 + 推理引擎」插图 | `features/home/components/engine-illustration/`（层叠几何参数在 `geometry.ts`）、`styles/engine-illustration.css`；首页背景在 `styles/llm-hero.css` |
| 模型介绍、图标、Coming soon 列表 | `features/pricing/lib/catalog.ts` |
| 模型卡片和详情布局 | `features/pricing/components/` |
| GPU 型号和参数 | `features/gpu/data.ts`；页面布局在同目录 `index.tsx` |
| Pricing 页面 | `features/pricing-overview/` |
| Blog / Docs 内容 | `features/blog/index.tsx`、`features/docs/index.tsx` |
| 顶部导航、Models 下拉 | `hooks/use-top-nav-links.ts`、`components/layout/components/models-nav-menu.tsx` |
| 页脚链接和排列 | `components/layout/components/footer.tsx` |
| Console 侧栏入口 | `hooks/use-sidebar-data.ts` |
| 政策正文 | `features/legal/llm-documents.ts` |
| Dashboard / Playground / 钱包 / 个人设置 | `features/dashboard/`、`features/playground/`、`features/wallet/`、`features/profile/`、`features/security/` |
| 全站字体、颜色；控制台样式 | `styles/index.css`、`styles/theme.css`；`styles/console.css` |

网站标题在 `web/index.html`，品牌默认名称与资源路径在 `web/src/lib/constants.ts`；Logo 和浏览器图标在 `web/public/fluxion-logo.svg`、`web/public/fluxion-icon.svg`。

## 3. 修改时注意

- **文案**：组件使用 `t('English text')`；翻译在 `web/src/i18n/locales/`，新增或更改文案时同步维护七种语言。
- **模型**：`catalog.ts` 提供展示文案和 Coming soon 信息；已接入模型的后端字段优先。添加展示条目不会开通推理，真实可用性和价格由后端控制。`web/scripts/preview-catalog.mjs` 仅供本地模拟预览。
- **GPU 与插图**：首页插图是示意图，不代表真实架构或可用性；GPU 页未连接库存和资源部署接口。
- **Blog**：目前是 Coming soon 页面，没有文章管理后台；新增文章需要补充页面内容和路由。
- **公共页面**：复用 `PublicLayout` 和 `Footer`，保持 header/footer 一致。政策只修改正文，不粘贴独立 HTML 页面的整套导航与样式。
- **样式**：优先复用 `web/src/components/` 中已有组件，遵循 `web/AGENTS.md`；保留上游 New API 的许可证及署名。

## 4. 检查与发布

在 `web/` 下运行，并按 `web/AGENTS.md` 对修改文件做 lint 和格式检查：

```bash
bun run typecheck
bun run test --maxWorkers=4
bun run build
```

浏览器检查改动页面的桌面和手机布局、链接与按钮。构建结果位于 `web/dist/`。

提交到 `llm-web` 不会自动更新线上网站。发布工具在另一个仓库的 `api-gateway/deploy/build-llm.sh`，具体流程见其 `deploy/README.md`。普通内容更新只发布 LLM 静态前端；线上与视频网站共用后端，不需要重启共用服务。
