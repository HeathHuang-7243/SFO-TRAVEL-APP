# 安卓发布

所有命令都在 `SFO-TRAVEL-APP` 克隆目录运行，不在原网站仓库执行。

## 测试包

GitHub → Actions → Android checks and debug APK → 最新成功运行 → Artifacts 下载 APK 压缩包，无需正式签名密钥。

Debug 使用独立 `.debug` 包名。GitHub 运行器的 Debug 密钥可能每次改变，测试包之间不保证覆盖安装。卸载前先备份；日常使用应使用固定密钥签名的正式版。

### 1.0.1 启动修复

修复首次启动缺少 `local_chunks` 表，以及点击重试时 `Connection sfo_travel already exists` 的问题。升级后的初始化逐条建表，保留旧 `local_data` 记录，并协调 WebView 与原生连接状态；不删除数据库、不清空账目或照片。初始化失败可再次尝试。

CI 在 Android 35 模拟器中测试真实 APK 的首次启动、旧表修复和多次页面重载，并校验数据保留。报告位于 `native-storage-test-results` artifact。浏览器测试仍独立验证 IndexedDB 预览。

若旧测试包无法启动且新包提示签名冲突，请保留旧安装，不要先清除数据或卸载。有已存数据时，需要先通过 ADB 为可调试包导出私有数据，或找回旧签名后制作可覆盖安装的修复包。普通文件管理器不能访问该私有目录。

## 首次配置正式签名

在自己的可信电脑安装 JDK，交互式生成密钥：

```sh
keytool -genkeypair -v -keystore sfo-travel-release.jks -alias sfo-travel \
  -keyalg RSA -keysize 3072 -validity 10000
```

保管并离线备份 `.jks`、密码和 alias。**密钥丢失后，已有用户不能直接安装同包名后续升级。** 不要提交 `.jks` 或密码至 Git。

在新仓库 Settings → Secrets and variables → Actions 添加 Repository secrets：

| Secret                | 值                                        |
| --------------------- | ----------------------------------------- |
| `SFO_KEYSTORE_BASE64` | `.jks` 文件的 Base64 内容                 |
| `SFO_STORE_PASSWORD`  | keystore 密码                             |
| `SFO_KEY_ALIAS`       | `sfo-travel`，或你的 alias                |
| `SFO_KEY_PASSWORD`    | 私钥密码，PKCS12 通常与 keystore 密码相同 |

也可使用已授权的 GitHub CLI，以管道写入密钥，避免输出到终端（Linux/macOS）：

```sh
base64 < sfo-travel-release.jks | gh secret set SFO_KEYSTORE_BASE64 --repo HeathHuang-7243/SFO-TRAVEL-APP
gh secret set SFO_STORE_PASSWORD --repo HeathHuang-7243/SFO-TRAVEL-APP
gh secret set SFO_KEY_ALIAS --repo HeathHuang-7243/SFO-TRAVEL-APP
gh secret set SFO_KEY_PASSWORD --repo HeathHuang-7243/SFO-TRAVEL-APP
```

## 发布版本

1. 确认 `main` 检查通过，并在真机验证相机、分享、SQLite 持久化、升级和恢复。
2. 更新版本，例如 `npm version 1.0.1 --no-git-tag-version`，提交并推送。
3. 创建对应标签：

```sh
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

`Signed Android release` 拒绝版本不一致、缺少签名或测试未通过的发布。成功后生成 APK、`SHA256SUMS`、`signature.txt`（公开证书信息，不含私钥）。同版本不覆盖发布，修复应使用新版本，避免移动已发布标签。

`versionCode = major × 1,000,000 + minor × 1,000 + patch`。版本必须递增，minor / patch 不得超过 999。始终使用同一正式包名和签名。

本地正式构建需要设置 `SFO_KEYSTORE_PATH`（绝对路径）及上述密码/alias 环境变量，再运行 `npm run android:release`。不要将变量写入受版本控制文件。

## 手机安装

登录 GitHub 下载 Release APK，在安卓文件管理器中打开，根据系统提示允许该来源安装。同签名新版本可覆盖升级并保留数据。Debug / Release 之间使用加密备份迁移。

尚未配置 Google Play、应用内自动更新或云同步。推送代码只构建测试包，正式发布需要显式推送版本标签。
