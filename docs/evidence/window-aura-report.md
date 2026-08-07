# Window Aura｜前台窗口与 click-through 报告

状态：`CANDIDATE / BLOCKED`。

## 已实现

- Rust 前台窗口传感器读取 HWND、窗口矩形、标题、PID、最大化/最小化状态和全屏启发式。
- 前端提供 Off/Subtle/Normal/Strong、Aura On/Off 和暂停边界。
- Canvas compositor 已有 Aura frame 投影，且不会拦截主窗口内的普通交互。

## 尚未宣称

- 当前版本还没有独立的、覆盖任意前台窗口的 native transparent click-through overlay；主界面中的 Aura 是预览投影，Wallpaper surface 是候选宿主。
- 多显示器、DPI、独占全屏、反作弊软件冲突和窗口切换恢复仍未完成 Windows 集成验收。
- `processName` 当前使用 `pid:<id>` 隐私最小化标识，不宣称已读取可执行文件名。

下一闸门是独立 overlay 的鼠标穿透、窗口边界同步和恢复收据。
