# 静态托管说明（尚未部署）

目标域名是 `history.maverik.fun`。这一步只说明以后怎么挂，不读取部署凭据，不改 DNS，也不在这次提交里实际上线。

站点是静态文件。页面、样式、图片和 `js/` 里的打包脚本都在仓库根目录。GitHub Pages 工作流只在推送到 `main` 时运行，并用 rsync 发布一份不含 `data/` 的站点。本分支的拉取请求不会触发那次发布。

Cloudflare 静态托管可以按同一份运行文件来配：

- 构建命令留空。几何包已经提交在 `js/atlas_boot.js` 和 `js/atlas_snapshots.js`。
- 发布目录用仓库根目录，或与 Pages 工作流相同的文件集合。不要把 `node scripts/export_geojson.js --with-prefectures` 的结果传上去；这个参数现在会直接拒绝。
- 郡 / 州 / 府边界已从源 GeoJSON 和两个几何包里去掉。发布前仍应确认响应里没有这些多边形。
- 现代省界 `js/china_geo_data.js` 仍在。它来自 DataV GeoAtlas，条款是学习和交流，不是本版要删的 CHGIS 层。要不要换成别的现代底图，留待以后决定。
- 自定义域名 `history.maverik.fun` 在 Cloudflare 控制台里把 CNAME 指到静态站点。不要把令牌、账号编号或 DNS 密钥写进仓库。

署名保持 GPL-3.0，并注明江山时序与 historical-basemaps。CHGIS 不在本发行版中；需要府界时向 Harvard Dataverse 按其条款另行获取。
