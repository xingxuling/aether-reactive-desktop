# Music Halo Pro｜WASAPI loopback 报告

状态：`CANDIDATE`，不是 `WASAPI_LOOPBACK_VERIFIED`。

## 已实现

- `src-tauri/src/platform/windows/audio_loopback.rs` 使用默认 render endpoint 的 shared loopback capture。
- 线程执行 COM 初始化、mix format 获取、loopback 初始化、capture buffer 读取和释放。
- 将 PCM 窗口转换为 volume、attack/release smoothed volume、bass/mid/treble、DFT bins、spectral flux、onset、beat candidate、silence 与 latency 字段。
- 事件通过 `aether:audio-reactive` 进入前端 `ReactiveDesktopState`；Local File 使用同一套 TypeScript DSP 结构回退。

## 当前证据

- Rust 编译、测试和 release bundle 通过。
- 当前没有在真实 Windows 播放设备上记录 `captured_frames > 0` 与 `non_zero_frames > 0` 的设备收据，因此不宣称 loopback 已验证。
- 浏览器预览没有 WASAPI，UI 使用明确的 Demo Pulse / Local File 回退。

## 结论

系统声音是产品 P0 主路径，Local File 和 Demo 是可用回退，不是对 WASAPI 成功的伪造。下一闸门是实机播放、静音、切换默认设备和停止/重启捕获的收据。
