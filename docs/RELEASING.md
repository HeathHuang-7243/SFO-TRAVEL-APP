# 安卓发布

所有命令都在 `SFO-TRAVEL-APP` 克隆目录运行，不在原网站仓库执行。

## 测试包

GitHub → Actions → Android checks and debug APK → 最新成功运行 → Artifacts 下载 APK 压缩包，无需正式签名密钥。

Debug 使用独立 `.debug` 包名。GitHub 运行器的 Debug 密钥可能每次改变，测试包之间不保证覆盖安装。卸载前先备份；日常使用应使用固定密钥签名的正式版。

### 1.2.1 固定签名与应用内更新

正式安装包名称为 `SFOBusinessTravel-v1.2.1.apk`，包名保持 `com.heathhuang.sfotravel`。设置中检查公开 GitHub Releases，下载到私有缓存，核验 SHA-256、包名、相同签名和递增版本后调用系统安装器。需用户确认，不会静默安装。

旧 `.debug` 测试版与正式版并存。先从测试版导出加密备份，在正式版恢复并核对账目和照片，再决定是否删除测试版；无需先卸载它。旧 Actions 临时签名的私钥不包含在 APK 中，无法从 APK 恢复，也不能用新密钥直接覆盖旧签名。

发布 CI 使用相同固定密钥构建一个较低版本的测试夹具和正式候选包，在独立 Android 35 模拟器中执行覆盖安装，核验 SQLite 文件校验值和私有文件标记保持不变。夹具仅测试升级机制，不发布，也不代表历史版本迁移覆盖；旧数据库结构另由原生存储测试覆盖。

### 1.1.3 紧凑页脚与问题反馈

去掉页面容器重复的底部留白，保留底部导航遮挡空间。设置中心新增 GitHub Issues 反馈入口。项目代码采用 MIT 许可证，第三方内容范围见根目录 NOTICE.md。

新增免费开源、用途和本地存储说明的开屏提醒。“不再显示”默认不勾选，选择仅记在本机；设置中的“关于应用 · 使用说明”可再次查看和取消“不再显示”。

### 1.1.2 自动主题

外观提供浅色、深色和自动三种选择。自动跟随 Android 系统显示模式，包括系统设置的定时深色模式；应用不另设固定时间表。手动选择优先，旧版手动设置继续保留，首次使用默认自动。系统栏、页面和应用重新进入后的主题同步更新。

### 1.1.1 手机布局修正

固定右上角应用名称的位置，移除旁边重复的栏目名称和时钟上方遗留分隔线。设置面板底部增加始终可见的“确认”按钮，点击后关闭设置；设置仍即时保存在本机。

### 1.1.0 手机设置与系统栏

左上角改为设置中心，提供相册副本开关（默认关闭）、三个时钟城市、外观、语言及备份。底部保留功能标签。开启相册保存后，在账目提交成功后复制照片；拒绝权限或写入失败不撤销账目，界面提供独立重试。

原生系统栏跟随应用主题更新文字、图标和背景，支持重新进入应用后恢复。Android 35 仪器测试覆盖真实 MediaStore 写入、无需相册读取权限、重复保存去重，以及深浅色图标与页面重载/Activity 重建。状态栏截图随 `native-storage-test-results` 测试报告上传。Android 6–9 的旧存储权限分支仍需对应真机验证。

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

在新仓库 Settings → Secrets and variables → Actions 添加名为 **`SFO_SIGNING_BUNDLE`** 的 Repository secret，值为一份 JSON，包含 `keystore`（密钥文件 Base64）、`storePassword`、`keyAlias` 和 `keyPassword` 四个字符串字段。不要把真实值提交到仓库、公开 Release 或 Issue 中。

已有私密备份 `SFO_SIGNING_BUNDLE.json` 时，复制整份内容到该 Secret；始终复用这份固定密钥。也可使用获授权的 CLI：

```sh
gh secret set SFO_SIGNING_BUNDLE --repo HeathHuang-7243/SFO-TRAVEL-APP < /安全路径/SFO_SIGNING_BUNDLE.json
```

构建脚本 `scripts/build-release.mjs` 在权限为 0600 的临时文件中还原密钥，仅传给 Gradle，结束后删除临时文件。密钥备份需单独安全保管，不随应用发布。

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

应用内支持用户主动检查、下载并确认安装更新；未配置 Google Play、静默自动更新或云同步。推送代码只构建测试包，正式发布需要显式推送版本标签。
