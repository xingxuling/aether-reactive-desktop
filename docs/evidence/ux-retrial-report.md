# UX Retrial｜前端真实冒烟报告

日期：2026-08-07。执行环境：Vite dev shell + Playwright/Chrome；这不是 Tauri native 集成验收。

## 已通过流程

- 首次运行显示 `AETHER REACTIVE DESKTOP / FIRST RUN` 与 `Start Aether`。
- 点击启动后进入新首页：Listening/Quiet、当前 Scene、大型预览、Change Scene、Music Halo、Window Aura、LOCAL ONLY。
- Scene Browser 显示 5 个场景；选择 Gold Pulse 后 Preview 更新，Apply Scene 可应用。
- Music Halo 显示 System Audio、Play Demo、Local File Mode、Living Album Cover 和 latency 入口。
- Settings 显示 Quality/Balanced/Eco、FPS/Frame/Memory/Render、启动项、Audio Reactive 和 Window Aura。
- 页面标题更新为 `Aether Reactive Desktop`，favicon 404 已修复；冒烟过程中没有新的应用 console error。

## 边界

浏览器中 System Audio、WorkerW、GSMTC、Foreground Window 使用明确 fallback；本报告不把这些 fallback 计入原生 VERIFIED。
