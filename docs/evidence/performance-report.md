# Performance｜本地遥测报告

状态：`BUILD_CANDIDATE`，不是硬件性能认证。

- 前端新增本地 `requestAnimationFrame` 采样：FPS、平均 frame time、可用 JS heap、render workload、audio workload、可见性和 sample count。
- Settings 页实时显示 FPS、Frame、Memory、Render，并提供 Quality / Balanced / Eco。
- Canvas 粒子密度按 profile 调整；Eco 降低粒子密度并降低绘制频率。
- Playwright 浏览器冒烟中观察到约 60 FPS、约 17 ms frame、约 21 MB JS heap；这只是当前浏览器 dev shell 的观测，不是 Windows GPU/CPU 预算证明。
- Rust 音频事件携带 capture/DSP/render/total latency 字段；当前真实设备捕获延迟仍为空。

下一闸门：Windows release、真实音频设备、单/多显示器和 Eco profile 的 30 分钟采样，以及 CPU/GPU/内存外部收据。
