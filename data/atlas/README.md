# data/atlas · Historical polygon sources

> **Approximate boundaries, not surveyed borders.** These polygons are schematic reconstructions for illustrating broad historical jurisdictions. They are not the product of scientific surveying and should not be cited as precise or authoritative borders.
>
> **近似边界，非测绘成果。** 本目录中的多边形为示意性复原，用于直观呈现历史上大致的管辖范围，并非科学测绘成果，请勿作为精确或权威的边界依据引用。

This directory is the editable source of `js/atlas_snapshots.js` and `js/atlas_boot.js`. Each `<dynasty>/<snapshot>.geojson` file is one map snapshot. `scripts/build_atlas.js` turns them into the bundles; see [CONTRIBUTING.md](../../CONTRIBUTING.md) for the editing workflow.

本目录是 `js/atlas_snapshots.js` 与 `js/atlas_boot.js` 的可编辑源数据，每个 `<朝代>/<快照>.geojson` 对应一个地图快照。编辑流程见 [CONTRIBUTING_ZH.md](../../CONTRIBUTING_ZH.md)。

## Provenance · 数据来源

The original import scripts are not in this repository, so provenance is reconstructed from the project's early documentation:

- **Prefecture-level boundaries** (`prefectures`: 郡 / 州 / 府) derived from **CHGIS V6** and the **Robert M. Hartwell China Historical GIS** are **not in this distribution**. Their arrays are empty. A ring identical to one of those prefecture rings was also removed from the source (战国鲁, the same ring as 薛郡). Qin 九原郡 was removed earlier because most of its edges sat on that mesh; that overlap is recorded as a provenance clue, not as a general license rule. Obtain the prefecture layer from the official CHGIS / Harvard Dataverse release. It is academic, non-commercial, and not redistributable, and it is not GPL-3.0. See https://chgis.fas.harvard.edu/data/chgis/v6/ and https://dataverse.harvard.edu/dataverse/chgis_v6.
- **Polity outlines** (`polities`) started from [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps), then were edited in this repository. Per-feature provenance was not recorded. A shared edge, or any similarity ratio, is not a license determination. These edited coordinates stay out of the public bundles and are not described as hand-drawn. The public map instead draws the upstream GeoJSON at commit `4b5039e50d8d2464b065bd76ad6086cd4597108d` under GPL-3.0. The maintainer added that LICENSE when asked about the data in [issue #3](https://github.com/aourednik/historical-basemaps/issues/3). [Issue #74](https://github.com/aourednik/historical-basemaps/issues/74) has no maintainer reply. See `docs/historical-basemaps-license.md`.
- **First-level divisions** (`regions`: 刺史部 / 道 / 路 / 省, etc.) do not have a recorded per-feature source. This edition does not publish their coordinates and does not call them hand-drawn.
- **Modern province outlines** from DataV GeoAtlas / Amap are not stored in this directory or in `js/china_geo_data.js`. The DataV help page says the data is from Amap and is for learning and exchange only: https://help.aliyun.com/zh/datav/datav-7-0/user-guide/datav-geoatlas-widgets/. That does not show a right to host or redistribute the vectors.
- Coordinates in this directory are not copied into `js/atlas_boot.js` or `js/atlas_snapshots.js`. Tan Qixiang's *The Historical Atlas of China* was used as a check, and no map images or data from that atlas are in this repository. This note is not a legal clearance.

原始导入脚本不在仓库中，以上来源依据项目早期文档整理。郡 / 州 / 府级边界不在本发行版中。战国鲁的环与 CHGIS 薛郡整环相同，已从源文件移除。秦九原郡早先因多数边落在该边界网上被移除；这只是来源线索，不是一条“相似到多少就可以下许可结论”的规则。政权和一级政区坐标没有逐条许可记录，公开包不收录这些多边形，也不把它们写成手绘。现代省界不在本目录。本说明不是法律结论。

## License · 许可

- Boundaries derived from **CHGIS V6** and the **Hartwell China Historical GIS** are **not shipped**. Their terms remain **academic, non-commercial use only; do not redistribute**, and they are **not** GPL-3.0. Do not add them back to this repository. Obtain them from the official CHGIS / Harvard Dataverse distribution. `scripts/export_geojson.js` rejects `--with-prefectures`.
- If you use CHGIS from that official distribution, cite: *CHGIS, Version: 6. © Fairbank Center for Chinese Studies of Harvard University and the Center for Historical Geographical Studies at Fudan University, 2016.*
- Polygon coordinates in this directory are not part of the public site. The repository license is GPL-3.0 for the code. That is not a finding that every ring in this directory may be redistributed.
- **Attribution**: when reusing these boundaries, maps or screenshots, credit **江山时序 Jiangshan Atlas** (https://github.com/DeanChensj/jiangshan-map) and the upstream sources above.

源自 CHGIS V6 与 Hartwell China Historical GIS 的郡州府边界已从本发行版移除，仍受其原始条款约束（仅限学术、非商业用途，不得再分发），不适用 GPL-3.0。请勿把该层加回本仓库；如需郡州府边界，请从 CHGIS / Harvard Dataverse 官方渠道获取。`scripts/export_geojson.js` 拒绝 `--with-prefectures`。代码和本项目自己整理的数据采用 GPL-3.0。这不是对每一条剩余边界的许可结论。转载或引用这些边界、地图或截图时，请注明「江山时序 Jiangshan Atlas」（https://github.com/DeanChensj/jiangshan-map）及上述原始数据来源。
