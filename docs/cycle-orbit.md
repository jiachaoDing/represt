# Cycle Orbit 视觉规范

训练周期是一条首尾相接的轨道，每个周期日占据一个节点。完整圆环、横向圆弧和纵向圆弧共享节点语义，各布局独立负责几何、视口与交互。

| 概念 | 跨页面约定 |
| --- | --- |
| 周期日 | 使用 `TrainingCycleSlot.id` 标识，序号取当前顺序的 `index + 1`。排序后仍按 slot id 保持查看位置 |
| 训练模板 | `slot.planId` 引用模板，允许多个节点引用同一模板。颜色沿用 `getTemplateColor` 与 `PlanColor`，空模板使用 `restDayColor` |
| 当前查看日 | `focused` 表达查看状态，模板填色始终保留，通过独立外圈和轻微放大聚焦 |
| 今天 | 由 `getTodayTrainingCycleDay` 得到真实 slot，以独立小圆点表达，可以与聚焦同时出现。空间允许时可补充本地化的今天文字 |
| 训练完成进度 | 由训练记录决定，使用独立的进度表达，节点填色、聚焦外圈、今天标记各自只承载上述语义 |
| 循环展示 | 数据保持一份 `slots`，布局中的环绕副本引用原 slot。副本隐藏于辅助技术且退出 Tab 顺序 |

| 模板颜色层级 | 适用元素 | 使用约定 |
| --- | --- | --- |
| Solid 实色 | 训练页顶部周期圆点、计划管理弧线的无文字节点、模板辅助标记 | 使用 `PlanColor.solid`，休息日使用 `restDayColor.solid` |
| Soft 柔和色 | 顶部模板标签、循环日程数字节点和日程卡片 | 背景使用 `PlanColor.soft`，文字配对 `PlanColor.text`，随日夜主题切换 |
| 独立焦点 | 当前选中模板或查看日 | 通过描边、外圈、尺寸或阴影强调，选中前后保持对应的颜色层级。模板关联高亮可使用独立轮廓 |
| 纵向日程 | 数字节点与日程卡片 | 呈现模板色和今天信息。滚动中心用于弧线几何、距离衰减及返回位置，行点击用于打开编辑面板 |

| 共用入口 | 使用方式 |
| --- | --- |
| `src/lib/cycle-orbit.ts` | `getCycleNodeState(slot, focusedSlotId, todaySlotId)` 即时派生两个独立标志，页面继续持有现有查看状态 |
| `CycleNode` | 接收现有 `PlanColor`、`focused`、可选序号 `day` 与 `today`，用于任意方向布局中的展示节点 |
| `CycleTodayMarker` | 在布局需要固定标记位置时独立放置。与 `CycleNode.today` 选择一个位置显示 |
| `cycle-orbit-tokens.ts` | 共用节点尺寸、焦点外圈、今天标记、轨道线条、距离衰减与动画参数。具体数值以代码为准 |
| 主题 | 复用 `--plan-*`、`--cycle-rest*`、`--cycle-focus`、`--cycle-track` 与 surface token，跟随现有日夜主题 |
| 动效 | 切换、滚动居中与吸附共用现有紧致 spring。布局将距离归一化后应用同一平方衰减；减少动态效果时停止位移与缩放过渡 |
| 可访问性 | 节点图形为装饰，外层控件提供本地化日期/模板名称、`aria-pressed` 和今天的 `aria-current="date"`。点击区域至少 44px，键盘焦点与查看状态独立 |

现有横向 `TrainingCycleWheel` 使用共享节点、今天标记、轨道 token 和吸附参数。纵向 `TrainingCycleSlotList` 与 `TrainingCycleWheelItem` 使用共享轨道、滚动参数与距离衰减，行节点复用 `CycleNode`。训练页完整圆环接入时可直接组合上述基础能力，节点定位和进度绘制由圆环布局负责。
