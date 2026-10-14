# SFO-TRAVEL-APP · 湾区随行 Android

独立的安卓商务差旅应用：本地账本、凭证照片、汇率与小费、旧金山天气与景点、Microsoft Ignite 会议收藏。

本仓库负责安卓客户端开发、打包和发布。原网站仓库 `HeathHuang-7243/SFO-Business-Travel` 不参与构建，也不会被本仓库工作流修改或部署。

## 功能与数据

- 安卓使用 **SQLite + 应用私有文件目录**，无需账号或服务器。
- 账目保存消费时的汇率，后续刷新不会改写旧账。
- 离线记账、查看凭证、浏览内置景点和缓存会议，使用手动或历史汇率。
- 联网直接更新公开的招行牌价、ECB 历史汇率、Open-Meteo 天气和 Ignite 目录，失败显示缓存及时间。
- 相机/相册凭证、CSV 导出、中英文、浅色/深色主题。
- AES-256-GCM 加密完整备份，包含账目、照片和收藏。恢复合并已有数据，同 ID 账目保留本机版本。
- 不向 GitHub、原网站或自建服务器上传个人数据。Android 自动备份及设备迁移已关闭，请自行导出备份。

卸载或清除应用数据会删除本地记录。备份密码无法找回；完整备份有效载荷上限 70 MB。原网站线上账目不会自动迁入，目前导入格式仅支持本应用备份。

## 开发

需要 Node.js 22+、JDK 21、Android SDK 35。Android 最低 API 23，且设备 Android System WebView 必须支持现代 JavaScript（Chromium 109+）；建议 Android 10 或以上设备。

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

- 推送 `main`、PR 或手动运行 **Android checks and debug APK**：检查、测试并构建 Debug APK，上传为 Actions artifact。
- 正式发布：按 [发布说明](docs/RELEASING.md) 配置持久签名密钥，再推送与 `package.json` 一致的标签，如 `v1.0.0`。验证通过后发布 APK、SHA-256 校验和及签名证书信息到 GitHub Releases。
- Debug 包名 `com.heathhuang.sfotravel.debug`，正式包名 `com.heathhuang.sfotravel`，两者独立安装和存储，可用加密备份迁移。
- 缺少正式签名 Secrets 时发布停止，绝不以 Debug 密钥发布正式版。
- 私有仓库下载需要访问权限。GitHub Releases 不等于 Google Play 上架。

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

见 [架构说明](docs/ARCHITECTURE.md)、[隐私说明](docs/PRIVACY.md) 和 [内容来源](NOTICE.md)。
