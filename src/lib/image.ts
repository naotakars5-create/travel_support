/**
 * 画像（data URL）を指定の最大辺まで縮小し、JPEG の data URL にして返す（Web専用）。
 * 端末ローカル保存（localStorage 等）の容量オーバーを防ぐため、写真は必ず縮小して保存する。
 * Web以外・失敗時は元の data URL をそのまま返す。
 */
export function downscaleImage(dataUrl: string, maxSize: number, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(dataUrl);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
