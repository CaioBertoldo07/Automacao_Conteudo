import { useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { PostItem } from "@/types";

/* ─── Props ──────────────────────────────────────────────────── */

interface MediaViewerProps {
  post: PostItem;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

/* ─── Component ──────────────────────────────────────────────── */

export function MediaViewer({
  post,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: MediaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll while the viewer is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Move focus into the modal for immediate keyboard control.
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Keyboard navigation: Esc / ← / →
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    /* Backdrop — click outside to close */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      {/* Modal — explicit h-[85vh] so the media container has a concrete
          pixel height; max-h and flex-1 alone are not enough for
          percentage-based constraints (max-h-full) to resolve correctly. */}
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Visualização de mídia"
        className="relative h-[85vh] w-full max-w-4xl overflow-hidden rounded-xl bg-black shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Media — fills the entire modal ── */}
        <div className="absolute inset-0">
          {post.mediaUrl ? (
            post.mediaKind === "video" ? (
              <video
                key={post.id}
                src={post.mediaUrl}
                controls
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <img
                key={post.id}
                src={post.mediaUrl}
                alt="Mídia gerada"
                className="h-full w-full object-cover object-center"
              />
            )
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/50">
              <ImageOff className="h-12 w-12" />
              <p className="text-sm">Sem mídia disponível.</p>
            </div>
          )}
        </div>

        {/* ── Controls — all overlaid, never push media down ── */}

        {/* Close */}
        <button
          type="button"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          onClick={onClose}
          aria-label="Fechar visualização"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Previous */}
        {hasPrev && (
          <button
            type="button"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={onPrev}
            aria-label="Mídia anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Next */}
        {hasNext && (
          <button
            type="button"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={onNext}
            aria-label="Próxima mídia"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
