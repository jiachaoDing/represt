# Exercise Catalog Editor

轻量化动作库与 i18n 管理工具。它是一个静态 HTML 工具，不接入主 App 路由，不需要后端。

## 打开方式

直接在浏览器中打开：

```text
tools/exercise-catalog-editor/index.html
```

打开页面后，先在 Sync Tab 选择项目根目录，再从项目源文件读取当前 catalog 和 i18n 数据。

## 当前功能

- Catalog Tab
  - 按 Exercises / Muscle Groups 拆分为两个子页面。
  - exercises 支持新增、编辑、删除和关键词搜索。
  - muscle groups 支持新增、编辑、删除和关键词搜索，并维护 en / zh-CN group name。
  - primaryMuscleGroupIds、secondaryMuscleGroupIds 使用多选控件。
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
    - `src/domain/exercise-catalog/types.ts`
    - `src/domain/exercise-catalog/exercises.ts`
    - `src/domain/exercise-catalog/muscles.ts`
    - `src/locales/en/exercises.ts`
    - `src/locales/zh-CN/exercises.ts`
    - `src/locales/en/muscles.ts`
    - `src/locales/zh-CN/muscles.ts`

## 第一版边界

- 不接入 Vite、React、Dexie、路由或主 App 业务流程。
- 不迁移历史用户数据。
- 直接读写文件依赖浏览器支持 File System Access API。
