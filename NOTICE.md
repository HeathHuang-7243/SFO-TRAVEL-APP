# 来源与第三方内容

经仓库所有者授权，基于 `HeathHuang-7243/SFO-Business-Travel` 的 `02593a5e475ac6472686dcb0cf2530971b9b1579` 创建独立安卓客户端。原网站及仓库未作修改。

保留并适配 TravelApp、汇率图表、主题、时钟、双语文案、景点和公开数据快照。原作者 Heath；本仓库新增安卓存储、备份、设备适配和构建发布流程。

项目作者拥有权利的代码和文档采用根目录 `LICENSE` 中的 MIT 许可证。MIT 不覆盖下列第三方内容，也不授予第三方商标权。

景点图片来源及署名保留在 `src/lib/attractions.ts` 并在详情页显示；`src/lib/place-photos.json` 为随包图片预览。这些图片不属于本项目的 MIT 授权范围，未将来源署名视为开放许可。再分发或商用时，应按具体来源确认所需许可。

天气 Open-Meteo 按 CC BY 4.0 署名，牌价来自招商银行，参考汇率来自 ECB，会议资料来自 Microsoft Ignite；这些机构不为应用背书。

React、Vite、Capacitor、社区 SQLite 插件、Recharts、Lucide 等保留各自许可证，精确依赖锁定于 `package-lock.json`。许可证见相应 npm 包及 Android 依赖。

`src/lib/sessions-snapshot.json`、汇率快照及外部服务返回的内容仍适用其原始来源条款，不因仓库公开而改为 MIT。天气资料使用时保留 Open-Meteo 的 CC BY 4.0 署名。

Android Gradle wrapper 来自 Gradle，适用 Apache License 2.0；保留 wrapper 脚本中的原始声明。其余第三方依赖也不因项目采用 MIT 而改变许可。
