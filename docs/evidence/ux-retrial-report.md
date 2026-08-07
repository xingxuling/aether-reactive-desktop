# UX Retrial｜前端真实冒烟报告

日期：2026-08-07。执行环境：Vite dev shell + Playwright/Chrome；这不是 Tauri native 集成验收。

## 已通过流程

- 首次运行显示 `AETHER REACTIVE DESKTOP / FIRST RUN` 与 `Start Aether`。
- 点击启动后进入新首页：Listening/Quiet、当前 Scene、大型预览、Change Scene、Music Halo、Window Aura、LOCAL ONLY；系统声音不可用时保持 `Quiet`，不会自动改成 Demo。
- Scene Browser 显示 5 个场景；选择 Gold Pulse 后 Preview 更新，Apply Scene 可应用。
- Music Halo 显示 System Audio、Play Demo、Local File Mode、Living Album Cover 和 latency 入口；只有显式点击 `Play Demo` 后才进入 `demo` 音频源。
- Settings 显示 Quality/Balanced/Eco、FPS/Frame/Memory/Render、启动项、Audio Reactive 和 Window Aura。
- Native first-run 回退根因已定位并修复：Wallpaper WebView 现在只读主窗口状态，不再持久化自己的默认状态，也不再广播自己的性能采样覆盖主窗口。
- Wallpaper 检查、启用和恢复现在都有超时/错误回收；成功挂载返回 `ATTACHED`，失败不会永久停留在 `检查中…`。
- 页面标题更新为 `Aether Reactive Desktop`，favicon 404 已修复；冒烟过程中没有新的应用 console error。

## 边界

浏览器中 System Audio、WorkerW、GSMTC、Foreground Window 使用明确 fallback；本报告不把这些 fallback 计入原生 VERIFIED。
