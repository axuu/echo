import type { Dispatch, SetStateAction } from "react";

import { devicePreferenceLabel, type DesktopState } from "../../appModel";
import type { EnvironmentInfo, ServiceSettings } from "../../types";
import type { SettingsCategory } from "../settingsConfig";

type OverviewSectionProps = {
  form: ServiceSettings;
  environment: EnvironmentInfo | null;
  desktop: DesktopState;
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
  desktop,
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

              <div className="settings-story-card">
                <div className="settings-story-copy">
                  <span className="settings-story-kicker">概览</span>
                  <h3>当前配置与运行状态</h3>
                  <p>这里展示运行环境、模型、摘要模式和服务状态。排障时请切换到环境检测或日志。</p>
                </div>
                <div className="settings-story-stats">
                  <div className="settings-story-stat">
                    <span>服务端口</span>
                    <strong>{form.host}:{form.port}</strong>
                  </div>
                  <div className="settings-story-stat">
                    <span>转写</span>
                    <strong>{form.transcription_provider === "siliconflow" ? "SiliconFlow API" : form.transcription_provider === "funasr" ? "FunASR" : form.transcription_provider === "multimodal" ? "多模态 ASR" : "Whisper 转写"}</strong>
                  </div>
                  <div className="settings-story-stat">
                    <span>摘要模式</span>
                    <strong>{form.summary_mode === "llm" ? "LLM 智能摘要" : "抽取式摘要"}</strong>
                  </div>
                </div>
              </div>

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
                <h3 className="overview-section-title">环境信息</h3>
                <div className="overview-info-grid">
                  <div className="overview-info-item">
                    <span className="overview-info-label">Python</span>
                    <span className="overview-info-value">{environment?.pythonVersion || "-"}</span>
                  </div>
                  <div className="overview-info-item">
                    <span className="overview-info-label">Torch</span>
                    <span className={`overview-info-value ${environment?.torchInstalled ? "text-success" : ""}`}>
                      {environment?.torchInstalled ? environment?.torchVersion || "已安装" : "未安装"}
                    </span>
                  </div>
                  <div className="overview-info-item">
                    <span className="overview-info-label">GPU</span>
                    <span className={`overview-info-value ${environment?.cudaAvailable ? "text-success" : ""}`}>
                      {environment?.cudaAvailable ? environment?.gpuName || "已就绪" : "未检测到"}
                    </span>
                  </div>
                  <div className="overview-info-item">
                    <span className="overview-info-label">yt-dlp</span>
                    <span className="overview-info-value">{environment?.ytDlpVersion || "-"}</span>
                  </div>
                  <div className="overview-info-item">
                    <span className="overview-info-label">{form.transcription_provider === "funasr" ? "FunASR" : "Whisper"}</span>
                    <span className={`overview-info-value ${environment?.localAsrInstalled ? "text-success" : ""}`}>
                      {environment?.localAsrInstalled ? environment?.localAsrVersion || "已安装" : "未安装"}
                    </span>
                  </div>
                  <div className="overview-info-item">
                    <span className="overview-info-label">FFmpeg</span>
                    <span className={`overview-info-value ${environment?.ffmpegLocation ? "text-success" : ""}`}>
                      {environment?.ffmpegLocation ? "已安装" : "未安装"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overview-section">
                <h3 className="overview-section-title">版本信息</h3>
                <div className="overview-info-grid">
                  <div className="overview-info-item">
                    <span className="overview-info-label">应用版本</span>
                    <span className="overview-info-value">v{desktop.version || "-"}</span>
                  </div>
                  <div className="overview-info-item">
                    <span className="overview-info-label">监听地址</span>
                    <span className="overview-info-value">{form.host}:{form.port}</span>
                  </div>
                  <div className="overview-info-item">
                    <span className="overview-info-label">语言</span>
                    <span className="overview-info-value">{form.language === "zh" ? "中文" : form.language === "en" ? "English" : "日本語"}</span>
                  </div>
                  <div className="overview-info-item">
                    <span className="overview-info-label">ASR 模型</span>
                    <span className="overview-info-value">{form.transcription_provider === "local" ? form.fixed_model : form.transcription_provider === "multimodal" ? form.multimodal_asr_model : form.siliconflow_asr_model}</span>
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
