import type { Dispatch, SetStateAction } from "react";

import { devicePreferenceLabel } from "../../appModel";
import type { EnvironmentInfo, ServiceSettings } from "../../types";
import type { SettingsCategory } from "../settingsConfig";

type OverviewSectionProps = {
  form: ServiceSettings;
  environment: EnvironmentInfo | null;
  serviceOnline: boolean;
  asrReady: boolean;
  funasrInstalled: boolean;
  localAsrInstalled: boolean;
  autoMindMapReady: boolean;
  setActiveCategory: Dispatch<SetStateAction<SettingsCategory>>;
};

export function OverviewSection({
  form,
  environment,
  serviceOnline,
  asrReady,
  funasrInstalled,
  localAsrInstalled,
  autoMindMapReady,
  setActiveCategory,
}: OverviewSectionProps) {
  return (
            <section className="settings-category-section">
              <header className="settings-category-header">
                <h2>设置总览</h2>
                <p>查看当前配置、运行状态和常用操作。</p>
              </header>

              <div className="overview-status-grid">
                <div className="overview-status-card">
                  <div className="overview-status-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <div className="overview-status-info">
                    <span className="overview-status-label">服务状态</span>
                    <strong className={`overview-status-value ${serviceOnline ? "text-success" : "text-danger"}`}>
                      {serviceOnline ? "运行中" : "已停止"}
                    </strong>
                  </div>
                </div>
                <div className="overview-status-card">
                  <div className="overview-status-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                    </svg>
                  </div>
                  <div className="overview-status-info">
                    <span className="overview-status-label">运行环境</span>
                    <strong className="overview-status-value">{environment?.runtimeChannel || form.runtime_channel || "base"}</strong>
                  </div>
                </div>
                <div className="overview-status-card">
                  <div className="overview-status-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                  <div className="overview-status-info">
                    <span className="overview-status-label">推理设备</span>
                    <strong className="overview-status-value">{form.transcription_provider === "local" ? devicePreferenceLabel(form.whisper_device) : form.transcription_provider === "funasr" ? devicePreferenceLabel(form.funasr_device) : "云端识别"}</strong>
                  </div>
                </div>
                <div className="overview-status-card">
                  <div className="overview-status-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.2 7.8l-7.7 7.7a4 4 0 0 1-5.7 0l-3-3a1 1 0 0 1 1.4-1.4l3 3a2 2 0 0 0 2.8 0l7.7-7.7a1 1 0 0 1 1.4 1.4z" />
                    </svg>
                  </div>
                  <div className="overview-status-info">
                    <span className="overview-status-label">LLM 摘要</span>
                    <strong className={`overview-status-value ${form.llm_enabled ? "text-success" : ""}`}>
                      {form.llm_enabled ? "已启用" : "已关闭"}
                    </strong>
                  </div>
                </div>
                <div className="overview-status-card">
                  <div className="overview-status-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="overview-status-info">
                    <span className="overview-status-label">语音识别服务</span>
                    <strong className={`overview-status-value ${asrReady ? "text-success" : "text-danger"}`}>
                      {form.transcription_provider === "siliconflow"
                        ? asrReady
                          ? "硅基流动已配置"
                          : "硅基流动待补全"
                        : form.transcription_provider === "multimodal"
                          ? asrReady
                            ? "多模态 ASR 已配置"
                            : "多模态 ASR 待补全"
                          : form.transcription_provider === "funasr"
                          ? funasrInstalled
                            ? "FunASR 已安装"
                            : "FunASR 未安装"
                          : localAsrInstalled
                            ? "Whisper 已安装"
                            : "Whisper 未安装"}
                    </strong>
                  </div>
                </div>
                <div className="overview-status-card">
                  <div className="overview-status-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 5h16" />
                      <path d="M4 12h10" />
                      <path d="M4 19h16" />
                      <circle cx="18" cy="12" r="2" />
                    </svg>
                  </div>
                  <div className="overview-status-info">
                    <span className="overview-status-label">自动导图</span>
                    <strong className={`overview-status-value ${autoMindMapReady ? "text-success" : ""}`}>
                      {autoMindMapReady ? "已启用" : "已关闭"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="overview-section">
                <h3 className="overview-section-title">快速操作</h3>
                <div className="overview-actions">
                  <button className="tertiary-button" type="button" onClick={() => setActiveCategory("runtime")}>运行环境维护</button>
                  <button className="tertiary-button" type="button" onClick={() => setActiveCategory("logs")}>查看日志</button>
                  <button className="tertiary-button" type="button" onClick={() => setActiveCategory("transcription")}>转写设置</button>
                  <button className="tertiary-button" type="button" onClick={() => setActiveCategory("generation")}>摘要设置</button>
                </div>
              </div>
            </section>
  );
}
