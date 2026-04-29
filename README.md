# 训练间歇记录器

一个面向力量训练场景的极简 PWA。当前实现已经覆盖“今日训练、模板维护、动作执行、最近一组补录、训练总结”这一轮最小闭环，数据保存在本地 IndexedDB。

## 安装依赖

```bash
npm install
```

## 启动开发环境

```bash
npm run dev
```

默认使用 Vite 开发服务器，`vite-plugin-pwa` 已开启开发环境调试能力。

## 构建

```bash
npm run build
```

## 预览 PWA

```bash
npm run preview
```

预览前请先执行 `npm run build`。打开预览地址后，可在浏览器开发者工具中查看 manifest 和 Service Worker 注册情况。

## 当前技术栈

- Vite
- React 19
- TypeScript
- Tailwind CSS（官方 Vite 插件接入）
- React Router
- Dexie
- vite-plugin-pwa

## 目录结构

```text
src/
  app/          应用入口、路由、PWA 注册
  components/   布局、总结区块、通用 UI 组件
  db/           Dexie 数据读写与 schema
  hooks/        页面数据 hook 与时间驱动 hook
  lib/          输入解析、倒计时、状态展示等轻量工具
  models/       持久化模型与派生状态类型
  pages/        训练安排、动作、模板、总结页面
  styles/       全局样式与 Tailwind 入口
public/
  favicon.svg
  icon.png
  icon-maskable.png
assets/
  logo.png
scripts/
  generate-assets.mjs
```

图标更新流程见 [docs/update-icons.md](docs/update-icons.md)。

## 当前已实现能力

- 自动创建“今日训练”，并按 `sessionDateKey` 识别当天会话
- 模板列表与模板动作 CRUD（支持可选默认重量、次数）
- 一套全局循环日程，可按自然日安排模板或休息日
- 空库时自动写入两套演示模板
- 从模板把动作追加到今日训练，并可只选择其中部分动作
- 命中当日循环模板时，进入训练页会自动加入今日训练且同一天只执行一次
- 手动向今日训练新增动作
- 删除今日训练中尚未开始的动作
- 动作页完成当前组，并记录完成时间
- 动作页在右上角菜单中撤销最近一次“完成本组”
- 基于 `restEndsAt` 计算每个动作的独立休息倒计时
- 动作页手动打开最近一组补录弹层，补录重量与次数
- 模板动作配置了默认重量或次数时，新生成组记录会先带入这些初始值
- 训练完成后查看总结页
- PWA manifest、Service Worker 注册、离线静态资源缓存

## 数据建模说明

- `WorkoutTemplate` 和 `WorkoutSession` 分离，模板编辑不会自动回写已生成训练。
- `TrainingCycle` 持久化一套全局循环配置，包含循环位数组、锚点日期与锚点位置。
- `TemplateExercise` 除组数与休息时长外，还可选持久化 `weightKg`、`reps` 作为模板默认值。
- `WorkoutSession` 还会记录当天是否已完成循环模板自动导入；会话状态仍在运行时由动作完成情况派生。
- `SessionExercise` 持久化 `completedSets`、`lastCompletedAt`、`restEndsAt` 等执行数据；动作状态同样在运行时派生。
- `SetRecord` 持久化本次训练的真实重量与次数；若动作来自模板，则创建组记录时会复制模板默认值作为可编辑初始值。
- `RestTimerState` 是由 `SessionExercise` 计算出的界面态，不是单独的数据库表。
- IndexedDB 当前包含 6 张表：`trainingCycles`、`workoutTemplates`、`templateExercises`、`workoutSessions`、`sessionExercises`、`setRecords`。

## 当前未覆盖的能力

- 训练总时长统计
- 训练中直接编辑长期模板
