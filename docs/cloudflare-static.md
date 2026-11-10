# 静态托管说明（尚未部署）

目标域名是 `history.maverik.fun`。这一步只说明以后怎么挂，不读取部署凭据，不改 DNS，也不在这次提交里实际上线。

站点是静态文件。页面、样式、图片和 `js/` 里的打包脚本都在仓库根目录。GitHub Pages 工作流不再在推送到 `main` 时自动运行。合并到 `main` 不会发布站点。要发布时，由人在 Actions 里手动运行 “Deploy GitHub Pages”。该工作流用 rsync 发布一份不含 `data/` 的站点。

Cloudflare 静态托管可以按同一份运行文件来配：

- 构建命令留空。几何包已经提交在 `js/atlas_boot.js` 和 `js/atlas_snapshots.js`。
- 发布目录用仓库根目录，或与 Pages 工作流相同的文件集合。不要把 `node scripts/export_geojson.js --with-prefectures` 的结果传上去；这个参数现在会直接拒绝。
- 郡 / 州 / 府边界已从源 GeoJSON 和两个几何包里去掉。与这些边界整环相同、或边数过半来自该边界网的环也已去掉。发布前仍应确认响应里没有这些多边形。
- 现代省界不在本发行版中。DataV GeoAtlas 写明数据来自高德、仅供学习和交流；这不足以证明可以公开托管或再分发。`js/china_geo_data.js` 只保留项目自述为公有领域的河流、湖泊和海岸线，不含省界坐标。
- 自定义域名 `history.maverik.fun` 在 Cloudflare 控制台里把 CNAME 指到静态站点。不要把令牌、账号编号或 DNS 密钥写进仓库。

署名保持仓库的 GPL-3.0，并注明江山时序。historical-basemaps 的仓库许可证是 GPL-3.0，但其数据许可证仍有未关闭的说明请求（上游 issue #74）。CHGIS 不在本发行版中；需要府界时向 Harvard Dataverse 按其条款另行获取。本说明不是对每一条剩余边界的法律保证。
