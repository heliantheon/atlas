# Atlas

Atlas 是 Helios 的中台管理前端，采用 Turborepo 组织多个 React/Vite 应用与共享包。

## 项目结构

| 路径               | 说明                                            |
| ------------------ | ----------------------------------------------- |
| `apps/portal/`     | 聚合入口/门户                                   |
| `apps/hermes/`     | Hermes/IAM 管理界面                             |
| `apps/zwei/`       | Zwei 业务管理界面                               |
| `apps/chaos/`      | Chaos 运维管理界面                              |
| `packages/ui/`     | Atlas 领域组合/历史兼容层；不得新增基础 primitive |
| `packages/shared/` | 共享类型、工具、服务能力                        |
| `src/`             | 兼容/历史源目录，新增能力优先放入 apps/packages |

## 技术栈

- React
- TypeScript
- Vite
- Turborepo
- shadcn/ui + Radix UI + Lucide
- Tailwind CSS + CSS variables
- ahooks / Zustand / React Router
- Sass

## 常用命令

```bash
pnpm install
pnpm dev
pnpm dev:portal
pnpm dev:hermes
pnpm dev:zwei
pnpm dev:chaos
pnpm build
pnpm lint
pnpm type-check
pnpm format:check
```

## UI 与架构规则

- 新页面优先落在对应 `apps/<domain>/`，跨 app 的非 UI 能力放 `packages/shared`；领域无关基础组件统一来自独立 `@heliannuuthus/ui`。
- Kubernetes 期望状态只属于私有 `heliantheons/applications` 仓库；本公共仓库只维护应用源码、镜像构建和容器内部配置。
- 开发 UI 前先检查 `@heliannuuthus/ui`。缺少基础组件或 API 能力时，先在 workspace 的独立 `ui/` 仓库新增或扩展、文档化并验证，再升级 Atlas 依赖；禁止在 `packages/ui` 或 app 内复制 primitive。
- 业务代码通过 `@heliannuuthus/ui/button`、`@heliannuuthus/ui/dialog` 等显式子路径导入。`packages/ui` 仅保留 Atlas 领域组合或迁移期历史代码，新代码不得扩大其基础组件公共面。
- 公共组件 API 对标 Ant Design 的成熟度与扩展性，但不得依赖或模拟 Ant Design；Radix、CVA、Tailwind 与 shadcn 来源仍是 `@heliannuuthus/ui` 的实现细节。
- 选定 app 迁移时必须全量改写，禁止保留 Ant Design import、兼容层、Provider、主题配置或包依赖；不能以渐进迁移为由留下混合组件体系。
- 使用 Radix 交互语义、Lucide 图标、CSS 变量和统一的 `cn` 工具；不要在多个 app 重复复制同一个基础组件。
- 不创建 Ant Design 兼容 facade；可以借鉴其一致命名、受控/非受控模式、事件语义、尺寸、状态和扩展点，再按 Heliannuuthus UI 的组合模型实现。
- 删除迁移期间的别名、旧 props 映射、同名重复组件和兼容导出；不得为了让旧调用继续编译而保留 facade。
- 全局样式只保留 reset、字体、设计令牌和应用壳层默认值；颜色、圆角、阴影、间距和动效使用语义化 CSS 变量。
- shadcn 基础组件使用 Tailwind + CVA 管理 variant；页面布局、复杂响应式区域和图谱界面使用局部 CSS Modules，避免把所有页面样式堆进 utility class。
- 状态样式使用 `data-state`、`aria-*` 或明确的业务 class；禁止依赖组件库内部 DOM、生成类名、深层选择器和无边界的 `:global`。
- 禁止以 `!important`、`transition: all`、任意 z-index 或 JavaScript 测量布局作为样式捷径。第三方组件允许受控的 `:global` 边界，但必须挂在本地容器下并单独审查。
- 布局优先使用 Grid、Flexbox、流式尺寸和 container/media query；动效优先只改变 `transform`/`opacity`，并支持 `prefers-reduced-motion`。
- 修改 Hermes、`packages/ui` 或 `packages/shared` 的样式后运行 `pnpm css:check`。该 harness 是机械底线，不能用忽略清单、空规则或改写扫描范围绕过失败；应修复违规样式或重写所属组件。
- Header 的全局搜索必须有明确的数据源与去向，否则不展示；文档、通知等图标操作无可见边框，并用真实状态驱动徽标。
- API 调用走 services 层，不要在组件里散落 axios/fetch。
- 公共 UI 包保持领域无关；不要把某个 app 的业务状态塞进 `@heliannuuthus/ui`。Atlas `packages/ui` 只允许领域组合和历史迁移代码。
- 与 Helios API 对齐时，先确认后端字段和分页/错误语义，不要仅靠 mock 推断。

## 验证 Checklist

1. 修改单 app：运行对应 `pnpm dev:<app>` 或 `turbo build --filter=@atlas/<app>`。
2. 修改共享包：运行 `pnpm type-check` 与 `pnpm build`。
3. UI 改动至少检查桌面和窄屏布局。
4. 提交前运行 `pnpm lint` 或说明未运行原因。
5. UI 迁移后搜索 `antd`、`@ant-design/icons`、`.ant-`、重复基础组件与无效样式；选定 app 中任何运行时命中都视为未完成。
6. 搜索并清理 `!important`、`transition: all`、组件库内部选择器和无边界 `:global`；第三方集成边界逐项人工审查。
7. 运行 `pnpm css:check`；全 Atlas 样式审计使用 `pnpm css:check:all`。
