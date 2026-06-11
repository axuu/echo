import type { ServiceSettings, StorageDirectoryStat, StorageLocationKind, StorageOverview } from "../../types";
import { formatStorageCount, formatStorageSize } from "../../utils";

type FilesSectionProps = {
  form: ServiceSettings;
  updateForm: (next: ServiceSettings) => void;
  registerFocusTarget: (targetKey: string) => (node: HTMLElement | null) => void;
  storageOverview: StorageOverview | null;
  storageLoading: boolean;
  storageCleaning: boolean;
  cacheDirectory: StorageDirectoryStat | null;
  tasksDirectory: StorageDirectoryStat | null;
  logsDirectory: StorageDirectoryStat | null;
  runtimeDirectory: StorageDirectoryStat | null;
  cleanupReady: boolean;
  cleanupTargetBytes: number;
  cleanupTargetCount: number;
  refreshStorageOverview: () => Promise<void>;
  openManagedDirectory: (kind: StorageLocationKind) => Promise<void>;
  cleanupManagedFiles: () => Promise<void>;
};

export function FilesSection({
  form,
  updateForm,
  registerFocusTarget,
  storageOverview,
  storageLoading,
  storageCleaning,
  cacheDirectory,
  tasksDirectory,
  logsDirectory,
  runtimeDirectory,
  cleanupReady,
  cleanupTargetBytes,
  cleanupTargetCount,
  refreshStorageOverview,
  openManagedDirectory,
  cleanupManagedFiles,
}: FilesSectionProps) {
  return (
    <>
            <section className="settings-category-section">
              <header className="settings-category-header">
                <h2>输出与文件</h2>
                <p>管理导出位置、应用数据目录和本地空间占用。</p>
              </header>
              <div className="settings-form-group">
                <label className="settings-input-group" ref={registerFocusTarget("data_dir")}>
                  <span className="settings-input-label">数据目录</span>
                  <input className="settings-input-field" value={String(form.data_dir)} onChange={(e) => updateForm({ ...form, data_dir: e.target.value })} />
                  <span className="settings-input-caption">存储视频摘要和元数据</span>
                </label>
                <label className="settings-input-group" ref={registerFocusTarget("cache_dir")}>
                  <span className="settings-input-label">缓存目录</span>
                  <input className="settings-input-field" value={String(form.cache_dir)} onChange={(e) => updateForm({ ...form, cache_dir: e.target.value })} />
                  <span className="settings-input-caption">临时缓存文件</span>
                </label>
                <label className="settings-input-group" ref={registerFocusTarget("tasks_dir")}>
                  <span className="settings-input-label">任务目录</span>
                  <input className="settings-input-field" value={String(form.tasks_dir)} onChange={(e) => updateForm({ ...form, tasks_dir: e.target.value })} />
                  <span className="settings-input-caption">任务历史记录</span>
                </label>
                <label className="settings-input-group" ref={registerFocusTarget("output_dir")}>
                  <span className="settings-input-label">输出目录</span>
                  <input className="settings-input-field" value={String(form.output_dir)} onChange={(e) => updateForm({ ...form, output_dir: e.target.value })} />
                  <span className="settings-input-caption">手动导出的 Markdown / Obsidian 笔记会写入这里。</span>
                </label>
              </div>
            </section>
            <section className="settings-category-section">
              <header className="settings-category-header">
                <h2>文件管理</h2>
                <p>查看本地空间占用，并安全清理缓存和孤儿任务目录。</p>
              </header>

              <div className="settings-update-overview" ref={registerFocusTarget("storage_cleanup")}>
                <div className="settings-update-copy">
                  <span className="settings-story-kicker">存储</span>
                  <h3>当前本地占用</h3>
                  <p>
                    已托管空间约 {formatStorageSize(storageOverview?.totals.managedBytes || 0)}，
                    共 {formatStorageCount(storageOverview?.totals.managedFiles || 0, "文件")}
                    ，{formatStorageCount(storageOverview?.totals.managedDirectories || 0, "目录")}。
                  </p>
                </div>
                <div className="settings-update-badges">
                  <span className="helper-chip">{storageLoading ? "扫描中..." : "统计已就绪"}</span>
                  <span className={`helper-chip ${cleanupReady ? "status-success" : "status-pending"}`}>
                    {cleanupReady ? "可校验引用关系" : "服务离线，禁用清理"}
                  </span>
                  <span className="helper-chip">可回收 {formatStorageSize(cleanupTargetBytes)}</span>
                </div>
              </div>

              <div className="settings-storage-grid">
                {(storageOverview?.directories || []).map((directory) => (
                  <article key={directory.key} className="settings-storage-card">
                    <div className="settings-storage-card-head">
                      <div>
                        <span className="settings-update-label">{directory.label}</span>
                        <strong>{formatStorageSize(directory.sizeBytes)}</strong>
                      </div>
                      <button className="secondary-button" type="button" onClick={() => void openManagedDirectory(directory.key)}>
                        打开目录
                      </button>
                    </div>
                    <p className="settings-storage-path">{directory.path}</p>
                    <div className="settings-storage-meta">
                      <span>{directory.exists ? "目录存在" : "目录不存在"}</span>
                      <span>{formatStorageCount(directory.fileCount, "文件")}</span>
                      <span>{formatStorageCount(directory.directoryCount, "子目录")}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="settings-storage-detail-grid">
                <article className="settings-storage-panel">
                  <span className="settings-update-label">缓存目录</span>
                  <strong>{formatStorageSize(cacheDirectory?.sizeBytes || 0)}</strong>
                  <p>当前仅把 `uploads` 和 `covers` 视为可安全回收的缓存内容，删除后必要资源会自动重新生成。</p>
                  <div className="settings-storage-meta">
                    <span>{formatStorageCount(storageOverview?.cleanup.cacheCandidateCount || 0, "可清理项")}</span>
                    <span>预计释放 {formatStorageSize(storageOverview?.cleanup.cacheCandidateBytes || 0)}</span>
                  </div>
                </article>
                <article className="settings-storage-panel">
                  <span className="settings-update-label">任务结果</span>
                  <strong>{formatStorageSize(tasksDirectory?.sizeBytes || 0)}</strong>
                  <p>仅识别目录名像任务 ID、但数据库中已不存在的孤儿任务目录，不会删除仍被引用的结果文件。</p>
                  <div className="settings-storage-meta">
                    <span>{formatStorageCount(storageOverview?.cleanup.orphanTaskCount || 0, "孤儿目录")}</span>
                    <span>预计释放 {formatStorageSize(storageOverview?.cleanup.orphanTaskBytes || 0)}</span>
                  </div>
                </article>
                <article className="settings-storage-panel">
                  <span className="settings-update-label">日志目录</span>
                  <strong>{formatStorageSize(logsDirectory?.sizeBytes || 0)}</strong>
                  <p>日志仅展示体积和位置，首版不提供清空操作，避免误删排障信息。</p>
                </article>
                <article className="settings-storage-panel">
                  <span className="settings-update-label">运行环境目录</span>
                  <strong>{formatStorageSize(runtimeDirectory?.sizeBytes || 0)}</strong>
                  <p>运行环境目录只做统计，不参与清理，避免影响 Python、Torch 或 CUDA 运行环境。</p>
                </article>
              </div>

              <div className="settings-update-next-step">
                <strong>清理说明</strong>
                <span>
                  {!cleanupReady
                    ? "当前服务离线，无法确认哪些任务目录仍被数据库引用，因此已禁用一键清理。"
                    : cleanupTargetCount > 0
                      ? `预计可安全清理 ${cleanupTargetCount} 项内容，释放约 ${formatStorageSize(cleanupTargetBytes)}。`
                      : "当前没有发现可安全清理的缓存或孤儿任务目录。"}
                </span>
              </div>

              <div className="settings-update-actions">
                <button className="primary-button" type="button" disabled={storageLoading || storageCleaning} onClick={() => void refreshStorageOverview()}>
                  {storageLoading ? "扫描中..." : "刷新统计"}
                </button>
                <button
                  className="secondary-button danger-button"
                  type="button"
                  disabled={!cleanupReady || storageCleaning || storageLoading}
                  onClick={() => void cleanupManagedFiles()}
                >
                  {storageCleaning ? "清理中..." : "一键清理孤儿项"}
                </button>
                <button className="secondary-button" type="button" onClick={() => void openManagedDirectory("data")}>
                  打开数据目录
                </button>
              </div>
            </section>
    </>
  );
}
