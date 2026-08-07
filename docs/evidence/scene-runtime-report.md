# Scene Runtime｜场景与投影报告

状态：`SOURCE_READY / BUILD_CANDIDATE`。

## 统一运行时

`ReactiveDesktopState` 汇总 time、audio、media、foreground window、pointer、performance、scene、display、startup 和 first-run 状态。Reducer 对输入做迁移、边界裁剪和可持久化合并。

## 五个 Scene

1. Deep Sky / 深空回响
2. Blue Hour / 蓝调时刻
3. White Silence / 白色静默
4. Gold Pulse / 金色脉冲
5. Album Immersion / 专辑沉浸

每个 Scene 同时描述 wallpaper、audio response、album cover mode、aura、overlays、palette、motion profile 和 performance profile。Canvas compositor 分层绘制 atmosphere、particles、rings、light、album identity、aura frame 和 onset accent。

## 回退策略

真实媒体/系统声音不可用时仍可使用 Generic Cover、Local File 或 Demo Pulse；回退状态会显示来源，不升级原生能力标签。
