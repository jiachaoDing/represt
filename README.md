# 训练间歇记录器

一个面向力量训练场景的极简 PWA 脚手架。当前阶段只初始化基础架构、页面壳子、路由、本地数据层和离线能力，不实现完整业务。

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
  components/   共享布局与基础展示组件
  db/           Dexie 数据库初始化与 schema
  hooks/        当前只放基础时间驱动 hook
  lib/          轻量工具函数
  models/       MVP 类型定义
  pages/        路由页面壳子
  styles/       全局样式与 Tailwind 入口
public/
  icon.svg
  icon-maskable.svg
```

## 当前已具备的能力

- 可运行的 Vite + React + TypeScript 项目
- Tailwind CSS 可直接使用
- PWA manifest、主题色、基础图标占位、开发环境 Service Worker
- 四个 MVP 路由页面壳子
- 适合移动端的共享布局
- Dexie 数据库与五张基础表 schema
- 训练模板、本次训练、动作、组记录、倒计时的基础类型定义

## 数据建模说明

- `WorkoutTemplate` 和 `WorkoutSession` 分离，符合“模板与本次训练分离”的规则。
- `SessionStatus` 与 `SessionExerciseStatus` 只保留 `pending | active | completed` 三种主状态。
- `RestTimerState` 使用 `endsAt` 作为核心字段，便于后续用结束时间戳计算剩余倒计时，并支持切页后继续运行。

## PWA 图标说明

当前使用的是占位 SVG 图标：

- `public/icon.svg`
- `public/icon-maskable.svg`

后续上线前建议替换为正式的 `192x192` 和 `512x512` PNG 图标，以获得更完整的安装体验。

## 下一步开发建议

1. 先补 Dexie 初始化数据与模板 CRUD，让训练安排页能读取真实模板。
2. 实现“基于模板创建本次训练”的流程，并把 `SessionExercise` 生成出来。
3. 实现动作页的“进入即开始当前待完成组计时”与“点击一次完成一组”核心逻辑。
4. 用 `endsAt` 驱动独立倒计时显示，并保证跨页面继续运行。
5. 最后再补训练总结页和最近一组重量、次数补录。
