# historical-basemaps 许可核对（2026-11-10）

这份记录只覆盖本轮查过的材料。它不是对全部历史边界的法律保证。

## 查过的原文

- 仓库：https://github.com/aourednik/historical-basemaps
- 核对时 `master` 提交：`4b5039e50d8d2464b065bd76ad6086cd4597108d`（2026-11-02，Update README.md）
- LICENSE 全文是 GNU GPL-3.0。序言写明它适用于 “software and other kinds of works”，并且 “it applies also to any other work released this way by its authors”。https://github.com/aourednik/historical-basemaps/blob/4b5039e50d8d2464b065bd76ad6086cd4597108d/LICENSE
- README 把 GeoJSON 当作可再使用的底图，字段有 `NAME`、`SUBJECTO`、`PARTOF`、`BORDERPRECISION`。精度按洲际/世界比例尺概括。Credits 写项目始于从多种来源收集、改绘并转换的底图，其中提到 ThinkQuest Team C006628 的匿名学生作品。README 没有给中国范围内的单个多边形另附一份更严的许可证。https://github.com/aourednik/historical-basemaps/blob/master/README.md
- CONTRIBUTING 只规定如何编辑 GeoJSON，没有第二套数据许可。

## issue #3 和 issue #74

- issue #3（2018-04-16，已关闭）问的是 “What is the licensing for this data?”。维护者 André Ourednik 于 2018-04-18 回复并加入 LICENSE：https://github.com/aourednik/historical-basemaps/issues/3
- 同帖随后有人说 GPL 不适合 Who's On First，并建议改成 CC BY、CC BY-SA 或 ODbL。作者没有改掉 GPL。issue 由提问者关闭。
- issue #74（2026-06-07，仍开放）询问 GPL-3.0 是否意图覆盖 GeoJSON，或可否改成 CC BY-SA / CC0 / ODbL。截止本轮核对，没有维护者答复。https://github.com/aourednik/historical-basemaps/issues/74

一个尚未答复的问题，不取消作者在被明确问到数据许可时已经放入仓库的 GPL-3.0。仓库总许可证也不自动证明某一份已经写明禁止再分发的第三方数据获得了授权。本轮没有在这些 GeoJSON 的中国要素上找到 CHGIS、DataV 或高德的署名。个别文件有极少 `INFO_UR` 或 `wikipedia` 字段，抽查落在欧洲或美洲条目，不在本图幅使用的中国政权多边形上。

## 本仓库几何不能整包放回

`data/atlas/` 的政权环没有逐条导入记录。早期文档只说政权轮廓以 historical-basemaps 为起点，而郡州府来自 CHGIS V6 / Hartwell，条款是学术、非商业、不得再分发。战国“鲁”的环与 CHGIS 薛郡整环相同，已经从源文件删除。因此本轮不把 `data/atlas/` 里现有的政权或政区坐标放进 `site/`。公开的历史着色只来自上述提交里的原始 `world_*.geojson`。

## 采用的部分

- 使用 `world_bc500.geojson` 到 `world_2010.geojson` 中、有 `NAME`、范围与图幅（约 66–142°E，14–55°N）相交的完整多边形。坐标四舍五入到 0.1°。不改用现代国界冒充更早的年份。
- 查看某年时，采用不晚于该年的最近一张上游图，并在页面写明上游年份。例如前 221 年用的是 `world_bc300.geojson`（前 300 年），不是前 221 年的细部秦界。1938 年用 `world_1938.geojson`，图上中国本部的上游名称是 “Chinese warlords”。
- 郡、州、府仍不发布。Natural Earth 1:50m 只继续作岸线、河流和湖泊。大学西迁四站保留。
- GPL-3.0 义务：署名 André Ourednik / historical-basemaps，附许可证和仓库地址，派生作品保持 GPL-3.0。本项目代码本来就是 GPL-3.0。
