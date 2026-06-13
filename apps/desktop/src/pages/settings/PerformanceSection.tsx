import type { Dispatch, SetStateAction } from "react";

import type { ServiceSettings } from "../../types";
import { parseMinOneInt } from "../../utils";

type PerformanceSectionProps = {
  form: ServiceSettings;
  updateForm: (next: ServiceSettings) => void;
  registerFocusTarget: (targetKey: string) => (node: HTMLElement | null) => void;
  recommendedTaskConcurrency: number;
  performanceRecommendation: string;
  setTaskListOpen: Dispatch<SetStateAction<boolean>>;
};

export function PerformanceSection({
  form,
  updateForm,
  registerFocusTarget,
  recommendedTaskConcurrency,
  performanceRecommendation,
  setTaskListOpen,
}: PerformanceSectionProps) {
  return (
    <>
            <section className="settings-category-section">
              <header className="settings-category-header">
                <h2>性能调优</h2>
                <p>并发数、重试和资源分配。</p>
              </header>
              <div className="settings-form-group">
                <label className="settings-input-group" ref={registerFocusTarget("task_concurrency")}>
                  <span className="settings-input-label">任务并发数</span>
                  <input className="settings-input-field" type="number" min={1} value={form.task_concurrency} onChange={(e) => updateForm({ ...form, task_concurrency: parseMinOneInt(e.target.value, recommendedTaskConcurrency) })} />
                  <span className="settings-input-caption">影响下载、转写、摘要的整体链路吞吐；云 API 可能存在并发限流，建议按当前环境推荐值设置。</span>
                </label>
                <label className="settings-input-group" ref={registerFocusTarget("mindmap_concurrency")}>
                  <span className="settings-input-label">导图并发数</span>
                  <input className="settings-input-field" type="number" min={1} value={form.mindmap_concurrency} onChange={(e) => updateForm({ ...form, mindmap_concurrency: parseMinOneInt(e.target.value, 1) })} />
                  <span className="settings-input-caption">影响摘要完成后的导图生成吞吐，不会占用摘要任务的并发槽位；建议保持 1。</span>
                </label>
                <label className="settings-input-group" ref={registerFocusTarget("summary_chunk_concurrency")}>
                  <span className="settings-input-label">摘要分块并发数</span>
                  <input className="settings-input-field" type="number" min={1} value={form.summary_chunk_concurrency} onChange={(e) => updateForm({ ...form, summary_chunk_concurrency: parseMinOneInt(e.target.value, 2) })} />
                  <span className="settings-input-caption">仅控制单个摘要任务内部同时请求的分块数量，不等同于任务并发数。</span>
                </label>
              </div>
              <div className="settings-form-group">
                <div className="settings-input-group">
                  <span className="settings-input-label">当前建议</span>
                  <span className="settings-input-caption">{performanceRecommendation}</span>
                </div>
                <div className="settings-input-group settings-performance-tasklist-entry">
                  <span className="settings-input-label">当前任务队列</span>
                  <div className="settings-inline-actions">
                    <button className="secondary-button" type="button" onClick={() => setTaskListOpen(true)}>
                      查看 tasklist
                    </button>
                  </div>
                </div>
              </div>
            </section>
    </>
  );
}
