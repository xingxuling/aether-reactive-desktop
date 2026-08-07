import { useRuntime } from "../../core/runtime/RuntimeContext";
import { THEMES } from "../../visual/themes";
import { setTreeSpiritAlwaysOnTop } from "../../adapters/tauri";

export function SettingsPanel() {
  const { state, publish, persistNow } = useRuntime();
  return (
    <section className="settings-panel glass-panel">
      <div className="settings-title">
        <div>
          <span className="eyebrow">SETTINGS</span>
          <h2>调一下你的桌面天气</h2>
        </div>
        <button className="quiet-button" onClick={() => void persistNow()}>保存</button>
      </div>
      <div className="setting-row">
        <span>主题</span>
        <div className="theme-options">
          {Object.values(THEMES).map((theme) => (
            <button
              key={theme.id}
              className={`theme-chip ${state.settings.theme === theme.id ? "selected" : ""}`}
              onClick={() => publish({ type: "settings:update", payload: { theme: theme.id } })}
            >
              <i style={{ background: theme.accent }} />{theme.label}
            </button>
          ))}
        </div>
      </div>
      <label className="switch-row">
        <span><strong>Eco Mode</strong><small>降低动画、世界 Tick 与扫描频率</small></span>
        <input
          type="checkbox"
          checked={state.settings.ecoMode}
          onChange={(event) => publish({ type: "settings:update", payload: { ecoMode: event.target.checked } })}
        />
      </label>
      <label className="switch-row">
        <span><strong>暂停效果</strong><small>保留世界状态，暂停可见的动态效果</small></span>
        <input
          type="checkbox"
          checked={state.settings.effectsPaused}
          onChange={(event) => publish({ type: "effects:toggle", payload: event.target.checked })}
        />
      </label>
      <label className="switch-row">
        <span><strong>树精灵置顶</strong><small>独立小窗保持在其他窗口之上</small></span>
        <input
          type="checkbox"
          checked={state.settings.alwaysOnTopTreeSpirit}
          onChange={(event) => {
            publish({ type: "settings:update", payload: { alwaysOnTopTreeSpirit: event.target.checked } });
            void setTreeSpiritAlwaysOnTop(event.target.checked);
          }}
        />
      </label>
    </section>
  );
}
