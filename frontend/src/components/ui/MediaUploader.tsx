import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export interface MediaUploaderProps {
  accept?: string;
  onUpload: (file: File) => Promise<void>;
  className?: string;
}

export function MediaUploader({ accept = "image/*,video/mp4", onUpload, className }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  function validateFile(file: File): string | null {
    if (file.size > MAX_SIZE_BYTES) {
      return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: 50 MB.`;
    }
    return null;
  }

  async function handleFile(file: File) {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }

    setError("");

    // Generate preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPreviewType(file.type.startsWith("video/") ? "video" : "image");

    // Upload with simulated progress (real XHR progress would require a custom axios adapter)
    setUploading(true);
    setProgress(10);
    const tick = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 85));
    }, 300);

    try {
      await onUpload(file);
      setProgress(100);
    } catch (uploadErr: unknown) {
      const msg =
        (uploadErr as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Erro ao fazer upload. Tente novamente.";
      setError(msg);
      setPreview(null);
      setPreviewType(null);
    } finally {
      clearInterval(tick);
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function clearPreview() {
    setPreview(null);
    setPreviewType(null);
    setError("");
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          dragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/60 hover:bg-surface/50",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Arraste um arquivo ou <span className="text-primary font-medium">clique para selecionar</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, MP4 — máx 50 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Enviando…
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Inline preview */}
      {preview && !uploading && (
        <div className="relative rounded-lg overflow-hidden border border-border w-fit">
          {previewType === "image" ? (
            <img src={preview} alt="Preview" className="max-h-40 max-w-xs object-contain" />
          ) : (
            <video src={preview} className="max-h-40 max-w-xs" controls muted />
          )}
          <button
            type="button"
            onClick={clearPreview}
            className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
