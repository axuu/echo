import type { Dispatch, RefObject, SetStateAction } from "react";

import { api } from "../../api";
import type { DesktopState, Snapshot } from "../../appModel";
import type { ServiceSettings } from "../../types";

type LogsSectionProps = {
  form: ServiceSettings;
  updateForm: (next: ServiceSettings) => void;
  registerFocusTarget: (targetKey: string) => (node: HTMLElement | null) => void;
  snapshot: Snapshot;
  desktop: DesktopState;
  serviceOnline: boolean;
  backendRunning: boolean;
  backendReady: boolean;
  effectiveLogPath: string;
  autoLaunchEnabled: boolean;
  setAutoLaunchEnabled: Dispatch<SetStateAction<boolean>>;
  silentStartEnabled: boolean;
  setSilentStartEnabled: Dispatch<SetStateAction<boolean>>;
  crashAutoRestart: boolean;
  setCrashAutoRestart: Dispatch<SetStateAction<boolean>>;
  developerModeEnabled: boolean;
  setDeveloperModeEnabled: Dispatch<SetStateAction<boolean>>;
  closeBehavior: "tray" | "exit";
  setCloseBehavior: Dispatch<SetStateAction<"tray" | "exit">>;
  logLevelFilter: "all" | "ERROR" | "WARNING" | "INFO";
  setLogLevelFilter: Dispatch<SetStateAction<"all" | "ERROR" | "WARNING" | "INFO">>;
  logAutoRefresh: boolean;
  setLogAutoRefresh: Dispatch<SetStateAction<boolean>>;
  filteredLogOutput: string;
  logTextareaRef: RefObject<HTMLTextAreaElement | null>;
  setServiceStatus: Dispatch<SetStateAction<string>>;
  setSaveStatus: Dispatch<SetStateAction<string>>;
  onRefresh: () => void;
  refreshLogs: () => Promise<unknown>;
  onOpenSetupAssistant: () => void;
};

export function LogsSection({
  form,
  updateForm,
  registerFocusTarget,
  snapshot,
  desktop,
  serviceOnline,
  backendRunning,
  backendReady,
  effectiveLogPath,
  autoLaunchEnabled,
  setAutoLaunchEnabled,
  silentStartEnabled,
  setSilentStartEnabled,
  crashAutoRestart,
  setCrashAutoRestart,
  developerModeEnabled,
  setDeveloperModeEnabled,
  closeBehavior,
  setCloseBehavior,
  logLevelFilter,
  setLogLevelFilter,
  logAutoRefresh,
  setLogAutoRefresh,
  filteredLogOutput,
  logTextareaRef,
  setServiceStatus,
  setSaveStatus,
  onRefresh,
  refreshLogs,
  onOpenSetupAssistant,
}: LogsSectionProps) {
  return (
            <section className="settings-category-section">
              <header className="settings-category-header">
                <h2>日志与控制</h2>
                <p>查看服务日志、管理后端进程、配置桌面行为与监听参数。</p>
              </header>

              {/* ═══════ 服务状态 ═══════ */}
              <div className="settings-cuda-section">
                <h3 className="settings-cuda-title">服务状态</h3>
                <div className="control-status-row" ref={registerFocusTarget("service_logs")}>
                  <span className={`helper-chip ${serviceOnline ? "status-success" : backendRunning ? "status-running" : "status-failed"}`}>{serviceOnline ? "服务在线" : backendRunning ? "启动中..." : "服务离线"}</span>
                  <span className={`helper-chip ${backendRunning ? (backendReady ? "status-success" : "status-running") : "status-pending"}`}>
                    {backendRunning ? (backendReady ? "内置后端运行中" : "内置后端启动中") : "内置后端未运行"}
                  </span>
                  {desktop.backend?.pid ? <span className="helper-chip">PID {desktop.backend.pid}</span> : null}
                </div>
                <div className="cuda-insight-grid">
                  <div className="setting-row"><span className="setting-label">服务名</span><span className="setting-value">{snapshot.systemInfo?.application?.name || "-"}</span></div>
                  <div className="setting-row"><span className="setting-label">版本</span><span className="setting-value">{snapshot.systemInfo?.application?.version || "-"}</span></div>
                  <div className="setting-row"><span className="setting-label">日志文件</span><span className="setting-value" style={{ fontSize: "0.82rem", wordBreak: "break-all", overflowWrap: "anywhere" }}>{effectiveLogPath}</span></div>
                </div>
              </div>

              {/* ═══════ 服务管理 ═══════ */}
              <div className="settings-cuda-section">
                <h3 className="settings-cuda-title">服务管理</h3>
                <div className="settings-form-group">
                  <label className="settings-input-group">
                    <span className="settings-input-label">监听地址</span>
                    <input
                      className="settings-input-field"
                      ref={registerFocusTarget("host")}
                      value={form.host}
                      onChange={(e) => updateForm({ ...form, host: e.target.value })}
                    />
                    <span className="settings-input-caption">服务绑定的 IP 地址，默认 127.0.0.1。</span>
                  </label>
                  <label className="settings-input-group">
                    <span className="settings-input-label">监听端口</span>
                    <input
                      className="settings-input-field"
                      ref={registerFocusTarget("port")}
                      type="number"
                      value={form.port}
                      onChange={(e) => updateForm({ ...form, port: parseInt(e.target.value) || 3838 })}
                    />
                    <span className="settings-input-caption">服务端口号，默认 3838。只有端口冲突或外部接入时再调整。</span>
                  </label>
                </div>
                <div className="desktop-actions">
                  <button
                    className={backendRunning ? "secondary-button danger-button" : "primary-button"}
                    type="button"
                    onClick={async () => {
                      if (backendRunning) {
                        await window.desktop?.backend.stop();
                        setServiceStatus("内置后端已停止");
                      } else {
                        await window.desktop?.backend.start();
                        setServiceStatus("已请求启动内置后端");
                      }
                      onRefresh();
                      await refreshLogs();
                    }}
                  >
                    {backendRunning ? "停止内置后端" : "启动内置后端"}
                  </button>
                  {backendRunning && (
                    <button className="secondary-button" type="button" onClick={async () => {
                      setServiceStatus("正在重启内置后端...");
                      await window.desktop?.backend.stop();
                      await new Promise((r) => setTimeout(r, 1500));
                      await window.desktop?.backend.start();
                      setServiceStatus("内置后端已重启");
                      onRefresh();
                      await refreshLogs();
                    }}>重启后端</button>
                  )}
                  <button
                    className="secondary-button danger-button"
                    type="button"
                    disabled={!serviceOnline}
                    onClick={async () => {
                      await api.shutdownService();
                      setServiceStatus("已向服务发送关闭请求");
                      onRefresh();
                      await refreshLogs();
                    }}
                  >
                    强制关闭服务
                  </button>
                </div>
              </div>

              {/* ═══════ 桌面偏好 ═══════ */}
              <div className="settings-cuda-section">
                <h3 className="settings-cuda-title">桌面偏好</h3>
                <div className="settings-form-group">
                  <div className="settings-input-group">
                    <div className="settings-toggle-row">
                      <div className="settings-toggle-label">
                        <span className="settings-toggle-title">开机自启动</span>
                        <span className="settings-toggle-caption">系统启动时自动运行 Echo。</span>
                      </div>
                      <label className="toggle-switch"><input type="checkbox" checked={autoLaunchEnabled} onChange={async (e) => { const v = e.target.checked; const result = await window.desktop?.app?.setAutoLaunch(v); if (typeof result === "boolean") { setAutoLaunchEnabled(result); if (result !== v) { setSaveStatus(`开机自启动${v ? "开启" : "关闭"}失败，请检查系统权限`); } } }} /><span className="toggle-slider" /></label>
                    </div>
                  </div>
                  <div className="settings-input-group">
                    <div className="settings-toggle-row">
                      <div className="settings-toggle-label">
                        <span className="settings-toggle-title">开机静默启动</span>
                        <span className="settings-toggle-caption">开机自启时隐藏窗口，仅显示托盘图标。</span>
                      </div>
                      <label className="toggle-switch"><input type="checkbox" checked={silentStartEnabled} disabled={!autoLaunchEnabled} onChange={async (e) => { const v = e.target.checked; setSilentStartEnabled(v); await window.desktop?.preferences?.setSilentStart(v); }} /><span className="toggle-slider" /></label>
                    </div>
                  </div>
                  <div className="settings-input-group">
                    <div className="settings-toggle-row">
                      <div className="settings-toggle-label">
                        <span className="settings-toggle-title">崩溃自动重启</span>
                        <span className="settings-toggle-caption">后端服务非预期退出时自动拉起。</span>
                      </div>
                      <label className="toggle-switch"><input type="checkbox" checked={crashAutoRestart} onChange={async (e) => { const v = e.target.checked; setCrashAutoRestart(v); await window.desktop?.preferences?.setCrashAutoRestart(v); }} /><span className="toggle-slider" /></label>
                    </div>
                  </div>
                  <div className="settings-input-group">
                    <div className="settings-toggle-row">
                      <div className="settings-toggle-label">
                        <span className="settings-toggle-title">开发者模式</span>
                        <span className="settings-toggle-caption">开启后显示后台日志和浏览器开发者工具，便于调试问题。</span>
                      </div>
                      <label className="toggle-switch"><input type="checkbox" checked={developerModeEnabled} onChange={async (e) => { const v = e.target.checked; setDeveloperModeEnabled(v); await window.desktop?.preferences?.setDeveloperMode(v); }} /><span className="toggle-slider" /></label>
                    </div>
                  </div>
                  <label className="settings-input-group">
                    <span className="settings-input-label">关闭窗口行为</span>
                    <select className="settings-select-field" style={{ maxWidth: 200 }} value={closeBehavior} onChange={async (e) => { const v = e.target.value as "tray" | "exit"; setCloseBehavior(v); await window.desktop?.preferences?.setCloseBehavior(v); }}>
                      <option value="tray">最小化到托盘</option>
                      <option value="exit">直接退出应用</option>
                    </select>
                    <span className="settings-input-caption">点击窗口关闭按钮时的行为。</span>
                  </label>
                </div>
                <div className="settings-reset-row">
                  <div className="settings-reset-row-copy">
                    <span className="settings-input-label">首页引导</span>
                    <span className="settings-input-caption">重新显示首次进入首页的功能指引。</span>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => { window.localStorage.removeItem("echo.homeTourSeen"); window.localStorage.removeItem("echo.summaryPreferenceHintSeen"); setSaveStatus("已清空首页引导记录。"); }}>重新显示</button>
                </div>
                <div className="settings-reset-row">
                  <div className="settings-reset-row-copy">
                    <span className="settings-input-label">配置引导</span>
                    <span className="settings-input-caption">重新打开首次配置引导助手。</span>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => { onOpenSetupAssistant(); setSaveStatus("已打开配置引导。"); }}>打开配置引导</button>
                </div>
              </div>

              {/* ═══════ 日志 ═══════ */}
              <div className="settings-cuda-section">
                <h3 className="settings-cuda-title">日志</h3>
                <div className="settings-input-group" style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["all", "ERROR", "WARNING", "INFO"] as const).map((level) => (
                        <button key={level} type="button" className={`filter-pill${logLevelFilter === level ? " active" : ""}`} onClick={() => setLogLevelFilter(level)}>
                          {level === "all" ? "全部" : level}
                        </button>
                      ))}
                    </div>
                    <div style={{ flex: 1 }} />
                    <div className="settings-toggle-row" style={{ gap: 8 }}>
                      <span className="settings-toggle-caption">自动刷新</span>
                      <label className="toggle-switch"><input type="checkbox" checked={logAutoRefresh} onChange={(e) => setLogAutoRefresh(e.target.checked)} /><span className="toggle-slider" /></label>
                    </div>
                  </div>
                </div>
                <textarea ref={logTextareaRef} className="textarea-field log-viewer" rows={22} readOnly value={filteredLogOutput || "暂无日志"}></textarea>
                <div className="desktop-actions" style={{ marginTop: 12 }}>
                  <button className="secondary-button" type="button" onClick={() => void refreshLogs()}>刷新日志</button>
                  <button className="secondary-button" type="button" onClick={async () => { await window.desktop?.shell.openPath(effectiveLogPath); }}>打开日志文件</button>
                  <button className="secondary-button" type="button" onClick={async () => { const p = await (window.desktop as any)?.logs?.exportLog?.(); if (p) setServiceStatus(`日志已导出到 ${p}`); }}>导出日志</button>
                  <button className="secondary-button danger-button" type="button" onClick={async () => { await (window.desktop as any)?.logs?.clearLog?.(); await refreshLogs(); setServiceStatus("日志已清空"); }}>清空日志</button>
                </div>
              </div>
            </section>
  );
}
