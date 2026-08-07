# True Aether Wallpaper｜Windows 原生边界报告

状态：`CANDIDATE / BLOCKED`，不是 `TRUE_WALLPAPER_VERIFIED`。

## 已实现

- `src-tauri/src/platform/windows/wallpaper.rs` 独立封装 `Progman → WorkerW → SHELLDLL_DefView` 探测。
- 探测后创建隐藏 Tauri webview，读取 HWND，设置 child/no-activate/tool-window 样式并尝试挂到 WorkerW。
- 读取虚拟桌面几何和显示器数量，支持恢复/解绑命令。
- WorkerW 不可用时没有假全屏、置底普通窗口或静态截图替代；UI 明确显示 `CANDIDATE / BLOCKED`。

## 当前证据

- Rust `cargo check`、release 编译通过。
- 浏览器预览主动返回 `blocked`，因为浏览器没有 Windows 桌面宿主权限。
- 本轮没有完成真实 Windows 集成证据 A–J：最小化、Win+D、图标可见/可拖拽、Alt+Tab、Explorer 重启恢复、应用重启恢复、启动项、多显示器和退出恢复。

## 结论

源码已达到 `SOURCE_READY`；原生链路只能标记为候选。若真实会话中 WorkerW 探测或挂载失败，必须继续显示阻塞状态，不能把可见预览当成真正壁纸。
