# 静态托管说明（尚未部署）

目标域名是 `history.maverik.fun`。这一步只说明以后怎么挂，不读取部署凭据，不改 DNS，也不在这次提交里实际上线。

站点的公开目录是 `site/`，不是仓库根目录。GitHub Pages 工作流只在人手动运行 “Deploy GitHub Pages” 时执行，推送或合并到 `main` 不会发布。工作流先核对 `site/` 与发布白名单一致，再上传 `site/`。

Cloudflare 静态托管请把发布目录设为 `site/`，构建命令留空。不要把仓库根目录当作发布目录：根目录里还有 `data/`、`scripts/` 和未纳入本发行版的地形图片。

- `site/` 里的历史政权、郡州府和周边国家多边形坐标是空的。来源文件仍在 `data/atlas/`，但没有逐条许可记录，本发行版不把它们放进公开包。共边比例不是许可判断。
- 现代省界不在本发行版中。DataV GeoAtlas 写明数据来自高德、仅供学习和交流：https://help.aliyun.com/zh/datav/datav-7-0/user-guide/datav-geoatlas-widgets/ 。
- 公开底图是 Natural Earth 1:50m 的陆地、河流和湖泊，版本 5.1.2。条款见 https://www.naturalearthdata.com/about/terms-of-use/ 。这是现代自然岸线，不是历史边界。来源文件和 SHA-256 在 `data/basemap/SOURCE.json`。
- 原先 `js/china_geo_data.js` 里的河流、湖泊和古海岸没有上游许可链接，本发行版不发布那些坐标，也不把仓库自述当成已经核验。
- 地形晕渲图片没有逐张记录高程来源，本发行版不发布，页面也不请求它们。
- 自定义域名 `history.maverik.fun` 在 Cloudflare 控制台里把 CNAME 指到静态站点。不要把令牌、账号编号或 DNS 密钥写进仓库。

署名保持仓库的 GPL-3.0，并注明江山时序。historical-basemaps 的仓库许可证是 GPL-3.0，但其数据许可证仍有未关闭的说明请求（https://github.com/aourednik/historical-basemaps/issues/74）。CHGIS 不在本发行版中。本说明不是法律保证。
