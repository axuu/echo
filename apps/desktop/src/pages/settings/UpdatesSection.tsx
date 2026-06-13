import type { UpdateState } from "../../appModel";

type UpdatesSectionProps = {
  registerFocusTarget: (targetKey: string) => (node: HTMLElement | null) => void;
  currentVersion: string;
  updateInfo: UpdateState;
  updateUnsupported: boolean;
  updateSummary: string;
  updateActionBusy: boolean;
  canCheckUpdate: boolean;
  canInstallUpdate: boolean;
  onCheckUpdate: () => Promise<unknown>;
  onDownloadUpdate: () => Promise<unknown>;
  onInstallUpdate: () => Promise<void>;
  onOpenUpdateDialog: () => void;
};

export function UpdatesSection({
  registerFocusTarget,
  currentVersion,
  updateInfo,
  updateUnsupported,
  updateSummary,
  updateActionBusy,
  canCheckUpdate,
  canInstallUpdate,
  onCheckUpdate,
  onDownloadUpdate,
  onInstallUpdate,
  onOpenUpdateDialog,
}: UpdatesSectionProps) {
  return (
    <section className="settings-category-section">
      <header className="settings-category-header">
        <h2>桌面应用更新</h2>
        <p>{canInstallUpdate ? "检查新版本并管理安装。" : "查看最新版本信息与更新日志。"}</p>
      </header>
      <div className="settings-update-module" ref={registerFocusTarget("app_updates")}>
        <div className="settings-update-overview">
          <div className="settings-update-copy">
            <h3>{canInstallUpdate ? "手动检查桌面端更新" : "手动检查最新版本"}</h3>
            <p>{updateSummary}</p>
          </div>
        </div>

        <div className={`settings-update-panel ${updateInfo.status === "available" || updateInfo.status === "downloaded" ? "is-highlight" : ""}`}>
          <span className="settings-update-label">当前 v{currentVersion}</span>
          <strong>
            {updateUnsupported
              ? "当前环境不可更新"
              : updateInfo.status === "available" || updateInfo.status === "downloaded"
              ? `发现新版本 v${updateInfo.version || "-"}`
              : updateInfo.status === "not-available"
                ? "已是最新版本"
                : updateInfo.status === "error"
                  ? "检查失败"
                  : updateInfo.status === "checking"
                    ? "正在检查"
                    : updateInfo.status === "downloading"
                      ? `下载中 ${Math.round(updateInfo.downloadProgress)}%`
                      : updateInfo.status === "installing"
                        ? "正在安装"
                        : "等待检查"}
          </strong>
          <p>
            {!canInstallUpdate && updateInfo.status === "available"
              ? `已检测到 v${updateInfo.version || "-"}，请使用桌面安装包完成更新。`
              : !canInstallUpdate && updateInfo.status === "not-available"
                ? "当前环境可查看最新版本信息，但不支持自动下载或安装。"
                : updateInfo.status === "available" || updateInfo.status === "downloaded"
                  ? `最新 v${updateInfo.version || "-"}，${canInstallUpdate ? "可下载安装。" : "请使用桌面安装包更新。"}`
                  : updateInfo.status === "error"
                    ? (updateInfo.errorMessage || "更新检查失败，请重试。")
                    : updateSummary}
          </p>
        </div>

        <div className="settings-update-actions">
          <button
            className="primary-button"
            type="button"
            disabled={!canCheckUpdate || updateActionBusy}
            onClick={async () => {
              try {
                if (!canCheckUpdate) {
                  return;
                }
                if (canInstallUpdate && updateInfo.status === "available") {
                  await onDownloadUpdate();
                  return;
                }
                if (canInstallUpdate && updateInfo.status === "downloaded") {
                  await onInstallUpdate();
                  return;
                }
                await onCheckUpdate();
              } catch {}
            }}
          >
            {!canCheckUpdate
              ? "当前环境无法检查更新"
              : !canInstallUpdate
                ? (updateInfo.status === "checking" ? "检查中..." : "检查更新")
              : updateInfo.status === "checking"
                ? "检查中..."
                : updateInfo.status === "downloading"
                  ? `下载中... ${Math.round(updateInfo.downloadProgress)}%`
                : updateInfo.status === "installing"
                    ? "安装中..."
                    : updateInfo.status === "available"
                      ? "下载并重启安装"
                      : updateInfo.status === "downloaded"
                        ? "立即重启安装"
                        : updateInfo.status === "error"
                          ? "重试检查"
                          : "检查更新"}
          </button>

          <button
            className="secondary-button"
            type="button"
            disabled={!canCheckUpdate}
            onClick={onOpenUpdateDialog}
          >
            查看更新详情
          </button>
        </div>

        {updateInfo.status === "available" || updateInfo.status === "downloaded" ? (
          <div className="settings-update-next-step">
            <strong>下一步</strong>
            <span>
              {!canInstallUpdate
                ? "当前环境仅支持查看最新版本信息，请前往桌面安装包完成更新。"
                : updateInfo.status === "available"
                  ? "已检测到新版本，继续后会下载更新并自动重启安装。"
                  : "更新已下载完成，可以立即重启应用完成安装。"}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
