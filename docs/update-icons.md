# 更新图标指南

本文说明当前仓库中浏览器 favicon、PWA 图标、Android launcher 图标、Android 启动图和 Android 通知小图标的更新方式。

## 资源分工

| 目标 | 源文件 | 生成或引用位置 | 更新方式 |
| --- | --- | --- | --- |
| 浏览器标签页 favicon | `public/favicon.svg` | `index.html` | 直接编辑 SVG |
| PWA 普通图标 | `assets/logo.png` | `public/icon.png`、`vite.config.ts` manifest | 替换源图后运行生成命令 |
| PWA maskable 图标 | `assets/logo-maskable.png` 或 `assets/logo.png` | `public/icon-maskable.png`、`vite.config.ts` manifest | 需要安全边距时新增或替换 `assets/logo-maskable.png`，再运行生成命令 |
| Android launcher 图标 | `assets/logo.png` | `android/app/src/main/res/mipmap-*`、`mipmap-anydpi-v26` | 替换源图后运行生成命令 |
| Android 启动图 | `assets/logo.png` | `android/app/src/main/res/drawable*/splash.png` | 替换源图或调整脚本参数后运行生成命令 |
| Android 通知小图标 | `android/app/src/main/res/drawable/ic_stat_trainre_notification.xml` | `RestTimerAlarmReceiver.java` | 直接编辑单色 vector |

## 更新 favicon

favicon 使用无背景 SVG，文件是：

```text
public/favicon.svg
```

修改后运行：

```bash
npm run build
```

构建后检查 `dist/index.html` 中的 favicon 引用仍为：

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

## 更新 PWA 和 Android 主图标

PWA PNG 图标、Android launcher 图标和 Android 启动图使用同一个主源图：

```text
assets/logo.png
```

建议源图使用正方形 PNG，至少 `1024x1024`。替换文件后运行：

```bash
npm run assets:generate
```

该命令会更新：

```text
public/icon.png
public/icon-maskable.png
android/app/src/main/res/mipmap-*
android/app/src/main/res/mipmap-anydpi-v26
android/app/src/main/res/drawable*/splash.png
```

如果还要同步到 Android 工程，运行：

```bash
npm run android:sync
```

## 单独调整 maskable 图标

PWA maskable 图标需要给系统裁切预留安全边距。需要单独控制时，新增或替换：

```text
assets/logo-maskable.png
```

然后运行：

```bash
npm run assets:generate
```

脚本会用 `assets/logo-maskable.png` 生成 `public/icon-maskable.png`；没有该文件时使用 `assets/logo.png`。

## 调整 Android 启动图背景和缩放

启动图参数在：

```text
scripts/generate-assets.mjs
```

常用参数：

```text
--logoSplashScale=0.24
--splashBackgroundColor=#F5F7FB
--splashBackgroundColorDark=#0F172A
```

修改参数后运行：

```bash
npm run assets:generate
npm run android:sync
```

## 更新 Android 通知小图标

通知小图标文件是：

```text
android/app/src/main/res/drawable/ic_stat_trainre_notification.xml
```

调用点是：

```text
android/app/src/main/java/com/trainre/app/RestTimerAlarmReceiver.java
```

通知小图标应保持透明背景和单色填充。修改后运行：

```bash
npm run android:sync
```

## 提交前检查

图标更新后建议执行：

```bash
npm run assets:generate
npm run build
npm run android:sync
```

提交时通常应包含源文件、生成脚本配置和生成后的 Android / PWA 资源。不要直接编辑 `dist/`，它由构建命令生成。
