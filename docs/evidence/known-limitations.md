# Aether Reactive Desktop v0.2｜Known Limitations

## 当前已证实

- TypeScript 前端生产构建通过；Rust 格式、测试、check 和 Windows release 编译通过。
- 本机 release EXE 可启动；MSI 和 NSIS bundle 已生成并有 SHA-256。
- 浏览器 UI 冒烟通过：首次运行、首页、Scene、Music、Settings。
- 本地 Local File/Demo fallback 不依赖云端账号，不把 fallback 标记成原生能力。

## CANDIDATE / BLOCKED

- True Wallpaper：WorkerW A–J 硬验收、Explorer 重启恢复、多显示器、DPI 和退出恢复未完成。
- WASAPI：没有真实设备 `captured_frames`/`non_zero_frames` 收据。
- GSMTC：WinRT metadata bridge 未完成，继续使用 Generic Cover / Local File。
- Window Aura：尚无独立 native click-through overlay；当前是前台窗口传感器和 preview projection。
- 安装器：未做 clean VM 安装、升级、卸载、SmartScreen 和签名验证。
- 性能：当前观测包含浏览器 dev shell，未完成 Windows GPU/CPU/长时间预算证明。
- 进程名：原生前台窗口状态目前返回 `pid:<id>`，避免扩大隐私读取范围。
- `npm install --package-lock-only` 报告 5 个依赖审计问题（3 moderate、1 high、1 critical）；尚未运行自动 `npm audit fix --force`，避免无审查升级破坏桌面构建。

这些限制不会被首页的 Demo Pulse、浏览器预览或源码存在掩盖。
