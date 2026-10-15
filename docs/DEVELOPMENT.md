# 开发指南

面向开发者。使用和下载应用请看 [应用介绍](../README.md)。

本仓库独立开发、打包和发布安卓客户端，不修改或部署原网站仓库。

## 开发

需要 Node.js 22.13+、JDK 21、Android SDK 35。Android 最低 API 23，且设备 Android System WebView 必须支持现代 JavaScript（Chromium 109+）；建议 Android 10 或以上设备。

```sh
npm ci
npm run dev                 # 浏览器预览，使用独立 IndexedDB
npm run check               # 单元测试 + TypeScript + 前端构建
npx playwright install chromium
npm run test:e2e            # 手机视口、离线操作测试
npm run android:debug      # 前端构建 + 同步 + Gradle APK 构建
```

设置 `ANDROID_HOME` 指向 Android SDK，或创建未跟踪的 `android/local.properties`。应用只载入随 APK 安装的静态资源，没有远程 `server.url`。浏览器预览的公共服务可能受跨域限制；安卓使用原生 HTTP。浏览器数据与手机数据互相独立。

## 打包与发布

- 推送 `main`、PR 或手动运行 **Android checks and debug APK**：检查、测试并构建 Debug APK，通过 Android 35 模拟器的原生 SQLite 启动与页面重载测试后，上传为 Actions artifact。
- 正式发布：按 [发布说明](RELEASING.md) 配置持久签名密钥，在 Actions 手动运行 **Signed Android release**，填写与 `package.json` 一致的标签，如 `v1.3.0`（也支持推送标签触发）。验证通过后发布 APK、SHA-256 校验和及签名证书信息到 GitHub Releases。
- Debug 包名 `com.heathhuang.sfotravel.debug`，正式包名 `com.heathhuang.sfotravel`，两者独立安装和存储，可用加密备份迁移。
- 缺少正式签名 Secrets 时发布停止，绝不以 Debug 密钥发布正式版。
- Actions 测试包下载需要登录 GitHub；公开 Release 的资源可直接下载。GitHub Releases 不等于 Google Play 上架。

## 结构

| 路径                 | 用途                                    |
| -------------------- | --------------------------------------- |
| `src/components/`    | 适配的界面、备份及凭证查看              |
| `src/storage/`       | SQLite / 预览驱动、本地事务、照片与恢复 |
| `src/services/`      | 公共数据、加密备份、安卓能力            |
| `src/lib/`           | 计算、双语文案、景点与公开快照          |
| `android/`           | 安卓工程、Gradle wrapper、权限与签名    |
| `.github/workflows/` | 检查、构建及 Release                    |
| `tests/`             | 数据完整性及移动界面测试                |

见 [架构说明](ARCHITECTURE.md)、[隐私说明](PRIVACY.md) 和 [内容来源](../NOTICE.md)。
