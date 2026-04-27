# TrainRe Agent Guide

本文件用于给后续进入仓库的 AI/Agent 提供稳定、可复用的协作约束。默认假设你正在修改当前仓库，而不是输出一份脱离项目的演示代码。

## 1. 项目事实

- 技术栈：React 19 + TypeScript + Tailwind CSS v4 + Vite + Dexie。
- 路由：当前项目实际使用 `react-router-dom@7.14.2`，不要按 v6 旧写法硬套。
- 主要交互形态：移动端 PWA，卡片式界面，偏接近 Material 3，但应保持轻量和直接。
- 安卓封装：项目已接入 Capacitor，涉及系统能力时要同时考虑 Web/PWA fallback 和 Android 增强。
- 所有文件按 UTF-8 读取和编辑。

## 2. 基本工作原则

- 先读现有实现，再动手改。
- 只做和需求直接相关的修改，不顺手重构无关代码。
- 优先小步补丁；Windows 环境下一次补丁不要过大。
- 保持现有风格，除非用户明确要求统一重构。
- 如果同一需求存在多个合理解释，先说清假设，不要静默拍板。
- 能通过现有通用组件解决的问题，不要额外造抽象层。

## 3. 文档原则

- 当前状态文档只写“现在如何工作”。
- 已退出当前行为的能力、依赖、链路、配置，不要写成“已弃用”“不再使用”这类墓碑说明。
- 历史变更放到 Git、PR 或提交说明，不放到现状文档。

## 4. 工具与环境约束

- 当前环境中 `rg` 不可执行；用 PowerShell 的 `Get-ChildItem`、`Select-String`、`Get-Content -Encoding utf8` 查找和读取文件。
- PowerShell 版本不支持用 `&&` 分隔命令。
- 搜索范围尽量先缩到 `src` 或相关目录，避免全仓库无界扫描。
- 编辑文件统一用小步 `apply_patch`。
- 不要用脚本批量重写大量文件，除非用户明确要求。
- 本项目本地视觉检查由用户完成；Agent 不需要调用 in-app browser API 或 DevTools 浏览器工具做视觉验收。

## 5. 代码修改原则

- 优先最小可行实现，不做未来假设型扩展。
- 不为单次使用场景提前抽象复杂配置。
- 你的每一处改动都应该能直接追溯到用户需求。
- 只清理由你这次修改引入的无用代码，不顺带清理历史遗留。
- 如果发现与当前需求冲突的已有改动，先停下来说明冲突点。

## 5.1 国际化原则

- 新增或修改用户可见 UI 文案时，默认走现有 i18n 资源，不要在组件、hook、service 或 native adapter 中硬编码中文/英文文案。
- 通用文案放在 `src/locales/*/common.ts`；独立领域的大型词表或资源使用单独 namespace 文件，例如动作词典使用 `src/locales/*/exercises.ts`。
- i18n key 使用稳定语义名，不使用中文原文当 key；动态内容使用 i18next 插值。
- 不为国际化改造迁移 Dexie 旧数据；历史模板、训练记录、快照名称保持原样。
- 当前语言下新创建的数据可以写入当前语言的显示名称，但不要批量改写既有用户数据。

## 6. 验证原则

- 涉及行为变更时，至少做一次可验证检查。
- 前端改动默认优先跑 `npm run build`，确认类型和打包通过。
- 涉及 lint、Hooks 规则或明显静态检查风险时，补跑 `npm run lint`。
- 涉及 Capacitor、PWA manifest、Service Worker、原生插件或安卓封装能力时，补跑 `npm run android:sync`。
- 如果无法验证，要明确写出没验证到什么。

## 7. 本地数据原则

- Dexie schema 变更必须通过 version migration 表达，不要直接假设用户都是新安装。
- 不要为了 UI 或交互需求顺手改历史数据结构。
- 删除、覆盖、批量修改训练记录等破坏性行为应集中走现有 service 或明确的业务入口。
- 迁移逻辑要兼容旧数据；如果无法判断旧数据形态，先说明风险再动手。

## 8. PWA 与 Android 原则

- 涉及系统能力时，优先设计统一 adapter/service，不要在业务组件里直接调用 Capacitor API。
- Web/PWA 能力作为 fallback，Android 封装能力作为增强，不要让纯 Web 运行路径崩溃。
- TWA、WebView、Capacitor 的能力边界不同；涉及通知、触感、后台、文件、权限时要先确认目标封装方式。
- 涉及 Android 权限或原生插件时，同步检查配置、调用点和 fallback。

## 9. 触感反馈原则

- 触感反馈是状态反馈，不是点击音效；普通点击、输入、Tab 切换、自动保存默认不震。
- 优先用于完成一组、保存成功、阻断错误、拖拽起止、危险操作确认等明确状态变化。
- 震动必须短促、克制、可预期，并提供用户设置开关。
- 统一通过 haptics service/hook 调用，不要在组件里散落 `navigator.vibrate` 或 `Haptics.*`。
- Web 端使用 Vibration API 作为 fallback；安卓封装后可用 Capacitor Haptics 或原生 Android haptic 能力增强。

## 10. 动画与交互原则

本项目动画目标不是“展示效果”，而是减少界面切换和状态变化的生硬感。

- 优先使用成熟动画库，默认首选 `framer-motion`。
- 列表插入、删除、补位、排序优先使用 `layout` / `AnimatePresence` 体系。
- 不要手写复杂 CSS keyframes 来替代本应由动画库处理的进出场和布局动画。
- 动画应克制、短促、可预期，避免做成慢吞吞的演示型转场。
- 默认优先 spring；参数应偏紧致，避免软塌、拖尾明显的阻尼。
- 微交互优先做轻微位移、透明度、缩放组合，不要做夸张旋转和大幅弹跳。
- 页面切换要区分层级：
  - 同级 Tab 切换：更轻的淡入/轻微纵向位移即可。
  - 进入详情页：更接近原生 push 的水平位移。
  - 返回上级：方向反转，保持一致的空间感。
- Bottom Sheet 应该是“带阻尼感地上来/下去”，不是线性滑板。
- Dialog 应该短促地淡入并略带缩放，不要大幅飞入。
- 按钮文案、图标、状态切换时，优先让组件“变形”，而不是内容瞬间跳变。

## 11. 动画实现建议

- 先抽通用动画容器，再接业务组件，避免动画逻辑散在页面里。
- 当前仓库已经有这些可复用组件，优先复用：
  - `src/components/motion/PageTransition.tsx`
  - `src/components/motion/AnimatedList.tsx`
  - `src/components/motion/AnimatedSheet.tsx`
  - `src/components/motion/AnimatedDialog.tsx`
  - `src/components/motion/AnimatedContentSwap.tsx`
  - `src/components/motion/motion-tokens.ts`
- 新动画优先复用 `motion-tokens.ts` 中的 transition token，不要每个组件都各写一套参数。
- 列表项动画要兼顾增删和拖拽，不要让 `layout` 动画破坏现有 `dnd-kit` 交互。
- 会做高度收起的容器要控制 `overflow`，避免内容露边。
- 不要同时叠两套页面转场机制，避免体感发虚或重复动画。

## 12. 性能与可访问性

- 优先动画 `transform`、`opacity`，少动高开销属性。
- 移动端动画时长通常控制在约 `160ms-240ms`。
- 优先尊重 `prefers-reduced-motion`，至少给出更轻量的回退。
- 长列表、拖拽、弹层同时存在时，避免额外引入高频重排。

## 13. Tailwind 配合建议

- Tailwind 负责静态样式和颜色；位移、透明度、布局过渡优先交给 `framer-motion`。
- 不要把复杂动画时序塞进一长串原子类里；动画逻辑应留在组件中表达。
- 如果某个元素需要动画收起，通常要显式处理：
  - `overflow-hidden`
  - 合理的圆角和阴影裁切
  - 避免和 `position: fixed`/`sticky` 的父子关系冲突

## 14. 输出风格

- 优先给出能直接落地到当前仓库的实现，不给脱离上下文的大段样例。
- 说明时先讲结论，再补关键取舍。
- 如果只是新增原则或文档，写得简洁、明确、可执行。
