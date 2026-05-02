# 训练间歇记录器

一个面向力量训练场景的极简 PWA。当前实现已经覆盖“今日训练、计划维护、动作执行、最近一组补录、训练总结”这一轮最小闭环，数据保存在本地 IndexedDB。

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
  pages/        训练安排、动作、计划、总结页面
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
- 计划列表与计划动作 CRUD（支持可选默认重量、次数）
- 一套全局循环日程，可按自然日安排计划或休息日
- 空库时自动写入两套演示计划
- 从计划把动作追加到今日训练，并可只选择其中部分动作
- 命中当日循环计划时，进入训练页会自动加入今日训练且同一天只执行一次
- 手动向今日训练新增动作
- 删除今日训练中尚未开始的动作
- 动作页完成当前组，并记录完成时间
- 动作页在右上角菜单中撤销最近一次“完成本组”
- 基于 `restEndsAt` 计算每个动作的独立休息倒计时
- 动作页手动打开最近一组补录弹层，按动作记录类型补录重量、次数、时长或距离
- 计划动作配置了默认重量或次数时，新生成组记录会先带入这些初始值
- 训练完成后查看总结页
- PWA manifest、Service Worker 注册、离线静态资源缓存

## 数据建模说明

- `WorkoutPlan` 和 `WorkoutSession` 分离，计划编辑不会自动回写已生成训练。
- `TrainingCycle` 持久化一套全局循环配置，包含循环位数组、锚点日期与锚点位置。
- `PlanExercise` 除组数与休息时长外，还可选持久化 `weightKg`、`reps` 作为计划默认值。
- 动作 catalog 通过 `measurementType` 定义记录类型：`weightReps`、`reps`、`duration`、`distance`、`weightDistance`。
- `WorkoutSession` 记录当天计划来源与最近同步计划时间；会话状态在运行时由实际执行情况派生。
- `SessionPlanItem` 表示当天训练计划项，训练页按它展示计划动作和临时新增动作。
- `PerformedExercise` 表示实际开始或完成过的动作，保存完成组数、最近完成时间与休息结束时间。
- `SetRecord` 按动作记录类型持久化本次训练的真实记录值，包括 `weightKg`、`reps`、`durationSeconds`、`distanceMeters`，并通过 `performedExerciseId` 指向实际执行动作。
- 总结页和日历记录日只根据真实 `SetRecord` 聚合，未开始的计划项不进入历史记录。
- `RestTimerState` 是由实际执行动作计算出的界面态，不是单独的数据库表。
- IndexedDB 当前包含 7 张表：`trainingCycles`、`workoutPlans`、`planExercises`、`workoutSessions`、`sessionPlanItems`、`performedExercises`、`setRecords`。

## 当前未覆盖的能力

- 训练总时长统计
- 训练中直接编辑长期计划
