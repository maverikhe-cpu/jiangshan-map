# data/atlas · Historical polygon sources

> **Approximate boundaries, not surveyed borders.** These polygons are schematic reconstructions for illustrating broad historical jurisdictions. They are not the product of scientific surveying and should not be cited as precise or authoritative borders.
>
> **近似边界，非测绘成果。** 本目录中的多边形为示意性复原，用于直观呈现历史上大致的管辖范围，并非科学测绘成果，请勿作为精确或权威的边界依据引用。

This directory is the editable source of `js/atlas_snapshots.js` and `js/atlas_boot.js`. Each `<dynasty>/<snapshot>.geojson` file is one map snapshot. `scripts/build_atlas.js` turns them into the bundles; see [CONTRIBUTING.md](../../CONTRIBUTING.md) for the editing workflow.

本目录是 `js/atlas_snapshots.js` 与 `js/atlas_boot.js` 的可编辑源数据，每个 `<朝代>/<快照>.geojson` 对应一个地图快照。编辑流程见 [CONTRIBUTING_ZH.md](../../CONTRIBUTING_ZH.md)。

## Provenance · 数据来源

The original import scripts are not in this repository, so provenance is reconstructed from the project's early documentation:

- **Prefecture-level boundaries** (`prefectures`: 郡 / 州 / 府) derived from **CHGIS V6** and the **Robert M. Hartwell China Historical GIS** are **not in this distribution**. Their arrays are empty. A ring is also omitted when it is identical to one of those prefecture rings, or when at least 20 edges and at least half of its edges belong to that mesh (0.01° rounding, either direction). That screen removed the rival polygon 鲁 (identical to 薛郡) and the Qin region 九原郡 (about 88% of its edges). It is not a claim that every similar shape is a copy. Obtain the prefecture layer from the official CHGIS / Harvard Dataverse release. It is academic, non-commercial, and not redistributable, and it is not GPL-3.0. See https://chgis.fas.harvard.edu/data/chgis/v6/ and https://dataverse.harvard.edu/dataverse/chgis_v6.
- **Polity outlines** (`polities`) started from [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps), whose repository license is GPL-3.0. [Issue #74](https://github.com/aourednik/historical-basemaps/issues/74) still asks whether that license was meant for the GeoJSON. Per-feature provenance was not recorded. Outlines whose rings failed the screen above are omitted. Outlines that only share a minority of edges are kept as this project's hand-adjusted drawings. Geometric similarity by itself was not the reason to delete a ring.
- **First-level divisions** (`regions`: 刺史部 / 道 / 路 / 省, etc.) are drawn by hand; the source of their early versions was not recorded. The same ring screen applies. A shared border segment on a kept outline is not an independent license.
- **Modern province outlines** from DataV GeoAtlas / Amap are not stored in this directory or in `js/china_geo_data.js`. The DataV help page says the data is from Amap and is for learning and exchange only: https://help.aliyun.com/zh/datav/datav-7-0/user-guide/datav-geoatlas-widgets/. That does not show a right to host or redistribute the vectors.
- All remaining geometry has been simplified (0.01° precision). Tan Qixiang's *The Historical Atlas of China* was used as a check, and no map images or data from that atlas are in this repository. The source of each individual feature is not recorded. This note is not a legal clearance of every remaining ring.

原始导入脚本不在仓库中，以上来源依据项目早期文档整理。本发行版已去掉郡 / 州 / 府级边界，以及与这些府界整环相同、或至少 20 条边且一半以上的边属于该边界网的环（0.01°，双向）。据此移除了战国鲁（整环即薛郡）和秦九原郡（约 88% 的边）。几何相似本身不是删除理由。该层源自 CHGIS V6 与 Hartwell，学术非商业且禁止再分发，不适用 GPL-3.0。政权轮廓以 historical-basemaps 为起点，仓库许可证为 GPL-3.0，但上游 issue #74 仍未说明这是否适用于 GeoJSON；单条要素来源没有记录。只共有少数边的轮廓作为项目手绘保留。现代省界不在本目录。保留几何经过简化。本说明不是对每一条剩余边界的法律结论。

## License · 许可

- Boundaries derived from **CHGIS V6** and the **Hartwell China Historical GIS** are **not shipped**. Their terms remain **academic, non-commercial use only; do not redistribute**, and they are **not** GPL-3.0. Do not add them back to this repository. Obtain them from the official CHGIS / Harvard Dataverse distribution. `scripts/export_geojson.js` rejects `--with-prefectures`.
- If you use CHGIS from that official distribution, cite: *CHGIS, Version: 6. © Fairbank Center for Chinese Studies of Harvard University and the Center for Historical Geographical Studies at Fudan University, 2016.*
- Rings that remain are this project's hand-adjusted drawings. The repository license is GPL-3.0 for code and for data this project created. That sentence is not a finding that every remaining ring was independently licensed.
- **Attribution**: when reusing these boundaries, maps or screenshots, credit **江山时序 Jiangshan Atlas** (https://github.com/DeanChensj/jiangshan-map) and the upstream sources above.

源自 CHGIS V6 与 Hartwell China Historical GIS 的郡州府边界已从本发行版移除，仍受其原始条款约束（仅限学术、非商业用途，不得再分发），不适用 GPL-3.0。请勿把该层加回本仓库；如需郡州府边界，请从 CHGIS / Harvard Dataverse 官方渠道获取。`scripts/export_geojson.js` 拒绝 `--with-prefectures`。代码和本项目自己整理的数据采用 GPL-3.0。这不是对每一条剩余边界的许可结论。转载或引用这些边界、地图或截图时，请注明「江山时序 Jiangshan Atlas」（https://github.com/DeanChensj/jiangshan-map）及上述原始数据来源。
