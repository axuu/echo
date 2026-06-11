import { useEffect, useRef, useState } from "react";

import { api } from "../../api";
import { useModalA11y } from "../../components/useModalA11y";
import type { KnowledgeTagRecord } from "../../types";

type TagManagerProps = {
  videoId: string | null;
  title: string;
  onClose(): void;
  onUpdated(): void;
};

export function TagManager({ videoId, title, onClose, onUpdated }: TagManagerProps) {
  const [tags, setTags] = useState<KnowledgeTagRecord[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!videoId) {
      return;
    }
    let cancelled = false;
    void api.getKnowledgeTags(videoId).then((payload) => {
      if (!cancelled && "video_id" in payload) {
        setTags(payload.items);
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const panelRef = useRef<HTMLDivElement>(null);
  useModalA11y(Boolean(videoId), onClose, panelRef);

  if (!videoId) {
    return null;
  }
  const activeVideoId = videoId;

  async function handleAdd() {
    if (!newTag.trim()) {
      return;
    }
    setLoading(true);
    try {
      const payload = await api.addKnowledgeTag({ video_id: activeVideoId, tag: newTag.trim() });
      setTags(payload.items);
      setNewTag("");
      onUpdated();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(tag: string) {
    setLoading(true);
    try {
      const payload = await api.deleteKnowledgeTag(activeVideoId, tag);
      setTags(payload.items);
      onUpdated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="knowledge-tag-manager"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-manager-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="knowledge-section-head">
          <div>
            <h3 id="tag-manager-title">管理标签</h3>
            <p>{title || videoId}</p>
          </div>
          <button className="tertiary-button" type="button" onClick={onClose}>关闭</button>
        </div>
        <div className="knowledge-tag-input-row">
          <input
            className="input-field"
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            placeholder="添加一个标签"
          />
          <button className="primary-button" type="button" onClick={handleAdd} disabled={loading}>添加</button>
        </div>
        <div className="knowledge-tag-records">
          {tags.map((tag) => (
            <div key={`${tag.video_id}-${tag.tag}`} className="knowledge-tag-record">
              <div>
                <strong>{tag.tag}</strong>
                <span>{tag.source}{tag.source !== "manual" ? ` · ${Math.round(tag.confidence * 100)}%` : ""}</span>
              </div>
              <button className="tertiary-button danger" type="button" onClick={() => void handleDelete(tag.tag)}>删除</button>
            </div>
          ))}
          {!tags.length ? <div className="knowledge-empty-state">当前视频还没有标签。</div> : null}
        </div>
      </div>
    </div>
  );
}
