import { useEffect, useState } from "react";
import {
  FileImage,
  Video,
  BookImage,
  Download,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ImageOff,
  Maximize2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MediaViewer } from "@/components/ui/MediaViewer";
import { usePosts, useDashboardStats } from "@/hooks/useContent";
import { postService } from "@/services/api";
import type { ContentType, JobStatus, PostItem, PostsFilter } from "@/types";

/* ─── Constants ──────────────────────────────────────────────── */

const TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ReactNode; color: string }> = {
  IMAGE: { label: "Imagem", icon: <FileImage className="h-3.5 w-3.5" />, color: "#3b82f6" },
  REEL:  { label: "Reel",   icon: <Video     className="h-3.5 w-3.5" />, color: "#a855f7" },
  STORY: { label: "Story",  icon: <BookImage className="h-3.5 w-3.5" />, color: "#f97316" },
};

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  DONE: {
    label: "Gerado",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  PROCESSING: {
    label: "Processando",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  PENDING: {
    label: "Pendente",
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  FAILED: {
    label: "Falhou",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

const ALL_STATUSES: JobStatus[] = ["DONE", "PROCESSING", "PENDING", "FAILED"];
const ALL_TYPES: ContentType[] = ["IMAGE", "REEL", "STORY"];
const PAGE_SIZE = 12;

/* ─── Helpers ────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─── Download button ────────────────────────────────────────── */

function DownloadButton({ post }: { post: PostItem }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!post.mediaUrl) return null;

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Validate ownership via the API (returns confirmed mediaUrl + filename).
      const info = await postService.getDownloadInfo(post.id);

      // 2. Fetch the media as a Blob so the browser saves it as a file instead of
      //    opening it in a new tab (which happens with <a download> for same-origin
      //    images/videos in most browsers).
      const response = await fetch(info.mediaUrl);
      if (!response.ok) throw new Error("Falha ao obter o arquivo de mídia.");
      const blob = await response.blob();

      // 3. Create a temporary object URL, trigger download, then release it.
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = info.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        msg === "Falha ao obter o arquivo de mídia." ? msg : "Erro ao baixar mídia."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      {/* Pre-download notice for REEL fallback — sets expectation before click */}
      {post.reelFallback && (
        <p className="flex items-center gap-1 text-xs text-amber-500">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Vídeo indisponível; download em imagem.
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        loading={loading}
        className="w-full"
      >
        <Download className="h-3.5 w-3.5" />
        Baixar mídia
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* ─── Post card ──────────────────────────────────────────────── */

interface PostCardProps {
  post: PostItem;
  onOpen: () => void;
}

function PostCard({ post, onOpen }: PostCardProps) {
  const typeCfg = TYPE_CONFIG[post.type];
  const statusCfg = STATUS_CONFIG[post.status];
  const date = post.calendarDate ?? post.createdAt;

  return (
    <Card className="flex flex-col gap-0 p-0 overflow-hidden">
      {/* Thumbnail — clickable area to open viewer */}
      <button
        type="button"
        className="group relative h-40 w-full overflow-hidden bg-muted flex items-center justify-center"
        onClick={onOpen}
        aria-label="Ampliar mídia"
      >
        {post.mediaUrl ? (
          // Use mediaKind (server-derived) instead of guessing from extension
          post.mediaKind === "video" ? (
            <video
              src={post.mediaUrl}
              className="h-full w-full object-cover"
              preload="metadata"
              muted
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt="Mídia gerada"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )
        ) : (
          <ImageOff className="h-8 w-8 text-muted-foreground opacity-40" />
        )}

        {/* Hover overlay hint */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
          <Maximize2 className="h-6 w-6 text-white opacity-0 drop-shadow-md transition-opacity group-hover:opacity-100" />
        </div>

        {/* Type badge overlay */}
        <span
          className="absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: typeCfg.color }}
        >
          {typeCfg.icon}
          {typeCfg.label}
        </span>

        {/* Fallback badge — only when REEL was saved as image */}
        {post.reelFallback && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
            imagem
          </span>
        )}
      </button>

      <div className="flex flex-col gap-3 p-4">
        {/* Status + date */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </span>
          <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
        </div>

        {/* Caption preview */}
        {post.caption ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{post.caption}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sem legenda</p>
        )}

        {/* Hashtags preview */}
        {post.hashtags && (
          <p className="line-clamp-1 text-xs text-primary/70">{post.hashtags}</p>
        )}

        <DownloadButton post={post} />
      </div>
    </Card>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export function ContentPage() {
  const [filters, setFilters] = useState<PostsFilter>({ page: 1, limit: PAGE_SIZE });

  // Use stats as the authoritative signal for active generation.
  // Posts are created only when DONE, so Post.status === PROCESSING never appears in the
  // list — polling must be driven by a source that knows about in-flight jobs.
  const { data: stats } = useDashboardStats();
  const isGenerating = (stats?.activeJobs ?? 0) > 0 || (stats?.calendarProcessing ?? 0) > 0;

  const { data, isLoading, isFetching, refetch } = usePosts(filters, isGenerating);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Viewer state: null = closed, number = index into data.data
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Close viewer whenever the visible list changes (filter or page change).
  useEffect(() => {
    setViewerIndex(null);
  }, [filters]);

  function setFilter<K extends keyof PostsFilter>(key: K, value: PostsFilter[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function goToPage(p: number) {
    setFilters((prev) => ({ ...prev, page: p }));
  }

  const posts = data?.data ?? [];

  return (
    <div className="flex-1 overflow-auto p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conteúdo Gerado</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} post${data.total !== 1 ? "s" : ""} no total` : "Carregando…"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Filtros:
          </div>

          {/* Status filter */}
          <select
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={filters.status ?? ""}
            onChange={(e) =>
              setFilter("status", (e.target.value as JobStatus) || undefined)
            }
          >
            <option value="">Todos os status</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={filters.type ?? ""}
            onChange={(e) =>
              setFilter("type", (e.target.value as ContentType) || undefined)
            }
          >
            <option value="">Todos os tipos</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_CONFIG[t].label}
              </option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={filters.from ?? ""}
            onChange={(e) => setFilter("from", e.target.value || undefined)}
            placeholder="De"
          />
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={filters.to ?? ""}
            onChange={(e) => setFilter("to", e.target.value || undefined)}
            placeholder="Até"
          />

          {/* Clear filters */}
          {(filters.status || filters.type || filters.from || filters.to) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilters({ page: 1, limit: PAGE_SIZE })}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Content grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <FileImage className="mb-4 h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-base font-medium text-foreground">Nenhum post encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filters.status || filters.type || filters.from || filters.to
              ? "Tente ajustar os filtros."
              : "Gere posts na página de Calendário."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((post, idx) => (
              <PostCard
                key={post.id}
                post={post}
                onOpen={() => setViewerIndex(idx)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage((filters.page ?? 1) - 1)}
                disabled={(filters.page ?? 1) <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                Página {filters.page ?? 1} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage((filters.page ?? 1) + 1)}
                disabled={(filters.page ?? 1) >= totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Media viewer — rendered outside grid to avoid stacking-context issues */}
      {viewerIndex !== null && posts[viewerIndex] && (
        <MediaViewer
          post={posts[viewerIndex]}
          onClose={() => setViewerIndex(null)}
          onPrev={() => setViewerIndex((i) => (i !== null ? i - 1 : null))}
          onNext={() => setViewerIndex((i) => (i !== null ? i + 1 : null))}
          hasPrev={viewerIndex > 0}
          hasNext={viewerIndex < posts.length - 1}
        />
      )}
    </div>
  );
}
