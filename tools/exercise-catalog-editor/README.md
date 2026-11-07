# Exercise Catalog Editor

轻量化动作库与 i18n 管理工具。它是一个静态 HTML 工具，不接入主 App 路由，不需要后端。

| 维护输入 | 用途 |
| --- | --- |
| `upstream-selection.json` | 固定 OpenExerciseDB 版本、提交与 SQLite SHA-256；维护既有 ID 映射、新增动作和显式变式 |
| `local-metadata.json` | 保存本地分类修正；重新导入时覆盖对应生成值 |
| `import-report.json` | 列出新增动作、不支持的记录组合、未建立上游映射的原有动作及重复候选 |
| `src/domain/exercise-catalog/legacy-v21.json` | 冻结兼容快照，不随目录或文案更新重新生成 |

在仓库根目录，将所选 SQLite 发布物保存到 `tmp/openexercisedb.db`，运行 `npm run catalog:import`。导入器先验证校验和，再生成元数据、英文讲解、中英文新增名称、署名与审核清单。原有训练记录模式和肌群记账比例由应用保留；不支持的记录组合不进入新增目录。

更新来源版本时先审核选择清单和分类修正，保留已发布 ID；运行 `npm run catalog:diff -- <基准提交>` 输出新增、移除及字段变更报告，默认基准为 HEAD。再运行 `npm run catalog:check`、`npm test` 与 `npm run build`。MCP 的目录子集由其构建脚本生成，禁止独立手改。

编辑器读取完整生成数据，保存动作时保留新增元数据。写回时保持目录拼装代码和类型文件，并同时保存生成数据、本地修正及 i18n；来源归属和讲解文本仍由导入流程维护。

## 打开方式

直接在浏览器中打开：

```text
tools/exercise-catalog-editor/index.html
```

打开页面后，先在 Sync Tab 选择项目根目录，再从项目源文件读取当前 catalog 和 i18n 数据。

## 当前功能

- Catalog Tab
  - 按 Exercises / Measurement Types / Movement Patterns / Muscle Groups 拆分为四个子页面。
  - exercises 支持新增、编辑和关键词搜索；已载入的发布 ID 不可改名或删除，尚未写回的新动作可删除。
  - measurement types 支持新增、编辑、删除和关键词搜索。
  - movement patterns 支持新增、编辑、删除和关键词搜索。
  - muscle groups 支持新增、编辑、删除和关键词搜索，并维护 en / zh-CN group name。
  - muscleDistribution 使用 JSON textarea。
  - movementPattern 使用下拉控件。
  - sourceUrls 使用一行一个值的 textarea。
  - exercise 关键词搜索包含动作名、动作 aliases、movement pattern、粗略肌群和 group aliases。
  - muscle groups 作为 exercise 表单的数据源。
- i18n Tab
  - 支持 exercises / muscles namespace。
  - 支持 en / zh-CN 文案编辑。
  - 支持 names、aliases、exercises 的 movementPatterns，以及 muscles 的 groups 和 groupAliases。
  - 支持搜索和缺失英文名、缺失中文名、alias 为空筛选。
  - 支持从 catalog id 生成缺失 i18n key。
- Validate Tab
  - 校验 catalog 重复 id/slug、引用完整性、movementPattern、measurementType、sourceUrls 和 exercises i18n 对齐情况。
  - muscles i18n 对象缺失时显示 warning。
- Sync Tab
  - 使用浏览器 File System Access API 选择项目根目录。
  - 支持从项目源文件读取当前 catalog 和 i18n 数据。
  - 支持把当前工具状态写回项目源文件。
- Export Tab
  - 生成可复制回项目的 TypeScript 内容。
  - 支持复制以下文件内容：
    - `src/domain/exercise-catalog/measurement-types.ts`
    - `src/domain/exercise-catalog/movement-patterns.ts`
    - `src/domain/exercise-catalog/muscles.ts`
    - `src/domain/exercise-catalog/types.ts`
    - `src/domain/exercise-catalog/exercises.ts`
    - `src/locales/en/exercises.ts`
    - `src/locales/zh-CN/exercises.ts`
    - `src/locales/en/muscles.ts`
    - `src/locales/zh-CN/muscles.ts`

## 第一版边界

- 不接入 Vite、React、Dexie、路由或主 App 业务流程。
- 不迁移历史用户数据。
- 直接读写文件依赖浏览器支持 File System Access API。
