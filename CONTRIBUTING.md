# Contributing

感谢你考虑参与 TrainRe。这个仓库优先接受小而清晰的改动：每个改动应能直接对应到一个问题、缺陷或用户可见改进。

## 开发环境

```bash
npm install
npm run dev
```

提交前请至少运行：

```bash
npm run lint
npm run build
```

涉及 Android、Capacitor、PWA manifest、Service Worker 或原生能力时，请额外运行：

```bash
npm run android:sync
```

## 代码原则

- 先读现有实现，再修改。
- 保持改动范围小，不顺手重构无关代码。
- 用户可见文案走现有 i18n 资源。
- 颜色优先使用语义化主题 token。
- 涉及 IndexedDB schema 时必须通过 Dexie version migration 兼容旧数据。
- 签名文件、`.env`、构建产物和本地配置不要提交。

## 许可证

贡献到本仓库的代码将按 `GPL-3.0-or-later` 授权发布。提交贡献即表示你有权按该许可证贡献这些内容。
