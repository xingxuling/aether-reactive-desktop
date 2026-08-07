# v0.2 旧模块处置

| 旧模块 | v0.2 处置 | 原因 |
|---|---|---|
| Dynamic Cover | 移入 `src/legacy/dynamic-cover/` | 假全屏不是 True Wallpaper；旧实现不进入主路径 |
| Project Terrarium | 移入 `src/legacy/project-terrarium/` | 用户反馈无聊；项目扫描不是新产品核心 |
| TreeSpirit | 移入 `src/legacy/tree-spirit/` | 用户反馈无聊；避免继续占据首页和托盘 |
| Pocket World | 移入 `src/legacy/pocket-world/`，暂停 | 保留确定性模拟、持久化与测试资产，暂不消耗主产品入口 |
| v0.1 Music Halo | 移入 `src/legacy/music-halo/` | 旧本地文件组件保留；新 Music Halo Pro 走统一 Reactive Runtime |

迁移使用 Git rename，未删除旧模块数据。v0.2 首页、托盘和状态模型不再引用旧 Toy 入口。
