import type { ServiceSettings } from "../../types";

type VideoSectionProps = {
  form: ServiceSettings;
  updateForm: (next: ServiceSettings) => void;
  registerFocusTarget: (targetKey: string) => (node: HTMLElement | null) => void;
  activeFocusTarget: string | null;
  bilibiliCookieCapturing: boolean;
  bilibiliCookieStatus: string;
  bilibiliQrcodeImage: string;
  captureBilibiliLoginCookies: () => Promise<void>;
};

export function VideoSection({
  form,
  updateForm,
  registerFocusTarget,
  activeFocusTarget,
  bilibiliCookieCapturing,
  bilibiliCookieStatus,
  bilibiliQrcodeImage,
  captureBilibiliLoginCookies,
}: VideoSectionProps) {
  return (
    <section className="settings-category-section">
      <header className="settings-category-header">
        <h2>视频获取</h2>
        <p>处理 B 站登录态、下载缓存和转写临时音频。遇到风控、登录或重复下载问题时先看这里。</p>
      </header>
      <div className="settings-form-group">
        <label
          className={`settings-input-group settings-focus-target ${activeFocusTarget === "ytdlp_cookies_file" ? "is-highlighted" : ""}`}
          ref={registerFocusTarget("ytdlp_cookies_file")}
        >
          <span className="settings-input-label">B 站 Cookies 文件</span>
          <div className="settings-input-action-row">
            <input
              className="settings-input-field"
              value={form.ytdlp_cookies_file || ""}
              onChange={(e) => updateForm({ ...form, ytdlp_cookies_file: e.target.value })}
              placeholder="C:\\Users\\you\\Downloads\\cookies.txt"
            />
            <button
              className="secondary-button"
              type="button"
              disabled={bilibiliCookieCapturing}
              onClick={() => void captureBilibiliLoginCookies()}
            >
              {bilibiliCookieCapturing ? "获取中..." : "登录获取"}
            </button>
          </div>
          <span className="settings-input-caption">推荐通过提示弹窗打开 B 站登录窗口自动生成；也可以手动填写从已登录浏览器导出的 cookies.txt。</span>
          {bilibiliQrcodeImage ? (
            <div className="settings-cookie-qrcode">
              <img src={bilibiliQrcodeImage} alt="B 站扫码登录二维码" />
              <span>用手机 B 站扫码确认后会自动写入 cookies 文件。</span>
            </div>
          ) : null}
          {bilibiliCookieStatus ? <span className="settings-input-caption">{bilibiliCookieStatus}</span> : null}
        </label>
        <label className="settings-input-group" ref={registerFocusTarget("enable_cache")}>
          <span className="settings-input-label">启用下载缓存</span>
          <select className="settings-select-field" value={form.enable_cache ? "true" : "false"} onChange={(e) => updateForm({ ...form, enable_cache: e.target.value === "true" })}>
            <option value="true">开启</option>
            <option value="false">关闭</option>
          </select>
          <span className="settings-input-caption">开启后会复用封面、上传文件和部分中间结果，适合反复处理同一批视频。</span>
        </label>
        <label className="settings-input-group" ref={registerFocusTarget("preserve_temp_audio")}>
          <span className="settings-input-label">保留临时音频</span>
          <select className="settings-select-field" value={form.preserve_temp_audio ? "true" : "false"} onChange={(e) => updateForm({ ...form, preserve_temp_audio: e.target.value === "true" })}>
            <option value="false">不保留</option>
            <option value="true">保留</option>
          </select>
          <span className="settings-input-caption">排查转写问题时可以临时开启；日常关闭能减少磁盘占用。</span>
        </label>
      </div>
    </section>
  );
}
