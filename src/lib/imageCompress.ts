/**
 * 图片压缩：长边限制 1280px，质量 0.8，输出 JPEG。
 * 用于：拍照保存 / 从相册上传，避免手机原图 3-8MB 导致 IndexedDB 存取与下载慢。
 * 返回 null 表示压缩失败，调用方可降级使用原 blob。
 */
export async function compressImageBlob(
  blob: Blob,
  maxLong = 1280,
  quality = 0.8,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const longSide = Math.max(img.naturalWidth, img.naturalHeight);
      const scale = longSide > maxLong ? maxLong / longSide : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
