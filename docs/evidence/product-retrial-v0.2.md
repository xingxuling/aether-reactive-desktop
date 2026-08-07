# Aether Reactive Desktop v0.2｜产品重构与验收总表

日期：2026-08-07  
产品：Aether Reactive Desktop / 以太响应式桌面  
工作分支：`feat/aether-reactive-desktop-v0.2`

## 裁决

v0.1 的问题不是“再增加几个 Toy”，而是桌面没有对真实环境产生持续反应。本轮把产品主线收束为：真实输入 → `ReactiveDesktopState` → `Scene` / compositor / native boundary，并把旧 Toy 降级为 legacy 或暂停。

## 证据状态

| 状态标签 | 当前结论 | 依据 |
|---|---|---|
| `SOURCE_READY` | PASS | Runtime、Scene、传感器、平台边界和证据文件已进入源码树 |
| `BUILD_CANDIDATE` | PASS | 前端生产构建与 Rust release 构建完成 |
| `WINDOWS_BUILD_VERIFIED` | PASS（本机） | Release EXE 生成，`--background` 启动后保持存活 8 秒 |
| `INSTALLER_VERIFIED` | NOT CLAIMED | MSI/NSIS 已生成，但没有 clean VM 安装、升级、卸载收据 |
| `TRUE_WALLPAPER_VERIFIED` | NOT CLAIMED | WorkerW 代码可编译；硬验收 A–J 未执行完成 |
| `WASAPI_LOOPBACK_VERIFIED` | NOT CLAIMED | WASAPI loopback 线程可编译；当前没有真实设备非零 PCM 收据 |
| `FULL_REACTIVE_VERTICAL_SLICE_VERIFIED` | NOT CLAIMED | 上述两个原生闸门和 Window Aura 仍未闭合 |

## 本轮已交付

- 首页、首次运行、Scene Browser、Music Halo、Wallpaper、Aura、Settings 新壳层。
- 统一状态模型、五个 Scene、Canvas 多层投影、Demo/Local File 回退。
- Windows Progman/WorkerW、WASAPI、前台窗口、启动项边界的 Rust 候选实现。
- 旧模块迁移到 `src/legacy/`，不再进入首页和新托盘菜单。
- 自动测试、浏览器 UI 冒烟、Windows release bundle、SHA-256 记录。

## 未闭合的最高价值闸门

在一台真实 Windows 用户会话中完成 WorkerW A–J、WASAPI 非零 PCM、Aura click-through 与 clean VM 安装验收，然后才提升对应 VERIFIED 标签。
