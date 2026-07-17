import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, RefreshCw, SwitchCamera, X } from "lucide-react";
import { FullScreenModal } from "@/components/FullScreenModal";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  open: boolean;
  /** 任务提示，显示在取景框上方 */
  hint: string;
  /** 子提示（如考生名） */
  subHint?: string;
  onClose: () => void;
  /** 拍照确认回调，返回 blob */
  onCapture: (blob: Blob) => void;
}

type Facing = "environment" | "user";

/**
 * 调用设备摄像头拍照的全屏模态。
 * - 优先后置摄像头（environment）
 * - 支持前后切换
 * - 拍后预览，可重拍或确认保存
 */
export default function CameraCapture({
  open,
  hint,
  subHint,
  onClose,
  onCapture,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(async (face: Facing) => {
    setLoading(true);
    setError(null);
    stopStream();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("UNSUPPORTED");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: face },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      const err = e as DOMException;
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        setError("摄像头权限被拒绝。请在浏览器设置中允许此站点使用摄像头。");
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        setError("未找到合适的摄像头设备。");
      } else if (err?.message === "UNSUPPORTED") {
        setError("当前浏览器不支持摄像头调用，请改用「手动标记」。");
      } else {
        setError(`摄像头启动失败：${err?.message || "未知错误"}`);
      }
    } finally {
      setLoading(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (open && !previewUrl) {
      startStream(facing);
    }
    return () => {
      if (!open) {
        stopStream();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 切换前后摄
  const switchFacing = () => {
    if (previewUrl) return;
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    startStream(next);
  };

  // 拍照
  const handleShoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // 前置摄像头镜像翻转，让预览与取景一致
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(canvas, 0, 0);
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.85,
    );
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    startStream(facing);
  };

  const handleConfirm = () => {
    if (!previewBlob) return;
    onCapture(previewBlob);
    cleanup();
  };

  const cleanup = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    stopStream();
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <FullScreenModal open={open}>
      <div className="relative flex h-full w-full flex-col bg-black safe-top safe-bottom">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleClose}
            aria-label="关闭"
            className="touchable flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">{hint}</div>
            {subHint && <div className="text-2xs text-white/60">{subHint}</div>}
          </div>
          <button
            onClick={switchFacing}
            disabled={!!previewUrl}
            aria-label="切换摄像头"
            className="touchable flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur disabled:opacity-30"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        </div>

        {/* 取景区 / 预览区 */}
        <div className="relative flex-1 overflow-hidden">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-warn" />
              <p className="text-sm text-white">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-white/30 text-white hover:bg-white/10"
                onClick={() => startStream(facing)}
              >
                重试
              </Button>
            </div>
          ) : previewUrl ? (
            <img src={previewUrl} alt="预览" className="h-full w-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  "h-full w-full object-cover",
                  facing === "user" && "scale-x-[-1]",
                )}
              />
              {/* 取景框装饰 */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-2/3 w-[88%] rounded-lg border-2 border-white/30" />
              </div>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="font-mono text-2xs text-white/70">CAMERA INIT…</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="px-6 py-6">
          {error ? (
            <Button variant="ghost" block className="text-white" onClick={handleClose}>
              关闭
            </Button>
          ) : previewUrl ? (
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={handleRetake}
                className="flex flex-col items-center gap-1 text-white"
              >
                <span className="touchable flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                  <RefreshCw className="h-5 w-5" />
                </span>
                <span className="text-2xs">重拍</span>
              </button>
              <button
                onClick={handleConfirm}
                className="flex flex-col items-center gap-1 text-ok"
              >
                <span className="touchable flex h-16 w-16 items-center justify-center rounded-full bg-ok text-ink-base shadow-[0_0_24px_rgba(57,211,83,0.6)]">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </span>
                <span className="text-2xs">保存</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <button
                onClick={handleShoot}
                disabled={loading}
                aria-label="拍摄"
                className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white/80 bg-white/10 backdrop-blur transition-transform active:scale-95 disabled:opacity-30"
                style={{ height: 72, width: 72 }}
              >
                <span className="h-14 w-14 rounded-full bg-white/90" />
                <Camera className="absolute h-6 w-6 text-ink-base" />
              </button>
            </div>
          )}
        </div>
      </div>
    </FullScreenModal>
  );
}
