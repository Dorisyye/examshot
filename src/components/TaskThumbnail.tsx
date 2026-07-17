import { useEffect, useState } from "react";
import { ImageOff, X } from "lucide-react";
import { getPhoto } from "@/lib/photoDb";
import { FullScreenModal } from "@/components/FullScreenModal";
import { cn } from "@/lib/utils";

interface Props {
  photoId: string;
  /** 缩略图标签，如「过程」「结果」 */
  label: string;
  /** 全屏查看时的说明文字，如「张三 · AAFL」 */
  caption?: string;
  /** 缩略图是否缺失（用于显示漏拍红框） */
  missing?: boolean;
  /** 尺寸 */
  size?: "sm" | "md";
}

/**
 * 任务照片缩略图：异步从 IndexedDB 加载，点击全屏查看。
 * 用于监考看板随时核对有没有拍错人。
 */
export default function TaskThumbnail({
  photoId,
  label,
  caption,
  missing = false,
  size = "md",
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objUrl: string | null = null;
    setLoading(true);
    setUrl(null);
    getPhoto(photoId).then((rec) => {
      if (revoked) return;
      if (rec) {
        objUrl = URL.createObjectURL(rec.blob);
        setUrl(objUrl);
      }
      setLoading(false);
    });
    return () => {
      revoked = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [photoId]);

  const dims = size === "sm" ? "h-9 w-12" : "h-12 w-16";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (url) setViewerOpen(true);
        }}
        className={cn(
          "group relative shrink-0 overflow-hidden rounded border bg-ink-raised transition-all active:scale-95",
          missing
            ? "border-bad/50"
            : "border-ink-border group-hover:border-type-muted",
        )}
        aria-label={`查看${label}照片`}
      >
        {loading ? (
          <div className={cn(dims, "flex items-center justify-center")}>
            <span className="font-mono text-2xs text-type-muted">…</span>
          </div>
        ) : url ? (
          <img
            src={url}
            alt={label}
            className={cn(dims, "object-cover")}
            loading="lazy"
          />
        ) : (
          <div className={cn(dims, "flex items-center justify-center")}>
            <ImageOff className="h-4 w-4 text-type-muted" />
          </div>
        )}
        {/* 底部标签条 */}
        <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-center text-2xs font-medium text-white">
          {label}
        </span>
      </button>

      <FullScreenModal
        open={viewerOpen}
        dismissible
        onClose={() => setViewerOpen(false)}
      >
        {url && (
          <div
            className="relative h-full w-full"
            onClick={() => setViewerOpen(false)}
          >
            <img
              src={url}
              alt={label}
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewerOpen(false);
              }}
              className="touchable absolute right-4 top-4 flex items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-center text-xs text-white">
              {caption ? `${caption} · ${label}` : label}
            </div>
          </div>
        )}
      </FullScreenModal>
    </>
  );
}
