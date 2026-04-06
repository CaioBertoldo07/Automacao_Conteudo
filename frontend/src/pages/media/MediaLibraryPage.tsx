import { useState } from "react";
import {
  Images,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Tag,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MediaUploader } from "@/components/ui/MediaUploader";
import { useMyProfile } from "@/hooks/useCompany";
import {
  useCompanyMedia,
  useUploadMedia,
  useDeleteMedia,
  useToggleMedia,
  type CompanyMedia,
  type MediaType,
} from "@/hooks/useMedia";

/* ─── Filters ────────────────────────────────────────────────── */

type TypeFilter = "ALL" | MediaType;
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

function filterMedia(
  list: CompanyMedia[],
  typeFilter: TypeFilter,
  statusFilter: StatusFilter
): CompanyMedia[] {
  return list.filter((m) => {
    if (typeFilter !== "ALL" && m.type !== typeFilter) return false;
    if (statusFilter === "ACTIVE" && !m.isActive) return false;
    if (statusFilter === "INACTIVE" && m.isActive) return false;
    return true;
  });
}

/* ─── Media card ─────────────────────────────────────────────── */

interface MediaCardProps {
  media: CompanyMedia;
  onToggle: () => void;
  onDelete: () => void;
  toggling: boolean;
  deleting: boolean;
}

function MediaCard({ media, onToggle, onDelete, toggling, deleting }: MediaCardProps) {
  const isVideo = media.type === "VIDEO";

  return (
    <div
      className={`rounded-lg border border-border bg-surface overflow-hidden transition-opacity ${
        !media.isActive ? "opacity-50" : ""
      }`}
    >
      {/* Preview */}
      <div className="aspect-square bg-background overflow-hidden">
        {isVideo ? (
          <video src={media.url} className="w-full h-full object-cover" muted />
        ) : (
          <img
            src={media.url}
            alt={media.description ?? media.filename}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 pt-2 pb-1 space-y-1.5">
        {/* Status badge */}
        {!media.isActive ? (
          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-border text-muted-foreground">
            Inativa
          </span>
        ) : media.aiAnalyzed ? (
          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-green-500/15 text-green-400">
            {media.category ?? "analisado"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium bg-yellow-500/15 text-yellow-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analisando…
          </span>
        )}

        {/* Description */}
        {media.description && (
          <p className="text-xs text-muted-foreground truncate">{media.description}</p>
        )}

        {/* Tags */}
        {media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {media.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs bg-border text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {media.tags.length > 4 && (
              <span className="text-xs text-muted-foreground">+{media.tags.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 px-2.5 pb-2.5">
        <button
          type="button"
          onClick={onToggle}
          disabled={toggling}
          title={media.isActive ? "Desativar mídia" : "Ativar mídia"}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {toggling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : media.isActive ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          title="Deletar mídia"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export function MediaLibraryPage() {
  const { data: profile } = useMyProfile();
  const companyId = profile?.id ?? "";

  const { data: mediaList, isLoading } = useCompanyMedia(companyId);
  const uploadMedia = useUploadMedia(companyId);
  const deleteMedia = useDeleteMedia(companyId);
  const toggleMedia = useToggleMedia(companyId);

  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Per-card pending state (mediaId → action)
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function handleUpload(file: File) {
    await uploadMedia.mutateAsync(file);
    setUploaderOpen(false);
  }

  async function handleToggle(media: CompanyMedia) {
    setPendingToggle(media.id);
    try {
      await toggleMedia.mutateAsync({ mediaId: media.id, isActive: !media.isActive });
    } finally {
      setPendingToggle(null);
    }
  }

  async function handleDelete(mediaId: string) {
    if (!window.confirm("Deletar esta mídia permanentemente?")) return;
    setPendingDelete(mediaId);
    try {
      await deleteMedia.mutateAsync(mediaId);
    } finally {
      setPendingDelete(null);
    }
  }

  const filtered = filterMedia(mediaList ?? [], typeFilter, statusFilter);

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Images className="h-6 w-6 text-primary" />
              Biblioteca de Mídia
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie as mídias da sua empresa
            </p>
          </div>
          <Button
            onClick={() => setUploaderOpen((o) => !o)}
            className="shrink-0 flex items-center gap-2"
          >
            {uploaderOpen ? (
              <><ChevronUp className="h-4 w-4" /> Fechar</>
            ) : (
              <><Plus className="h-4 w-4" /> Adicionar mídia</>
            )}
          </Button>
        </div>

        {/* Uploader (collapsible) */}
        {uploaderOpen && (
          <Card>
            <CardContent className="pt-4">
              <MediaUploader onUpload={handleUpload} />
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">Todos</option>
              <option value="IMAGE">Imagem</option>
              <option value="VIDEO">Vídeo</option>
              <option value="LOGO">Logo</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">Todas</option>
              <option value="ACTIVE">Ativas</option>
              <option value="INACTIVE">Inativas</option>
            </select>
          </div>
          {mediaList && (
            <div className="flex items-end pb-0.5">
              <span className="text-xs text-muted-foreground">
                {filtered.length} de {mediaList.length} mídia{mediaList.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (mediaList ?? []).length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Images className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="text-base font-medium text-foreground">Nenhuma mídia ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Faça upload de imagens e vídeos da sua empresa para usar nos posts.
              </p>
            </div>
            <Button onClick={() => setUploaderOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar mídia
            </Button>
          </div>
        )}

        {/* Empty filtered state */}
        {!isLoading && (mediaList ?? []).length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma mídia corresponde aos filtros selecionados.
            </p>
            <button
              type="button"
              onClick={() => { setTypeFilter("ALL"); setStatusFilter("ALL"); }}
              className="text-sm text-primary hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((m) => (
              <MediaCard
                key={m.id}
                media={m}
                onToggle={() => handleToggle(m)}
                onDelete={() => handleDelete(m.id)}
                toggling={pendingToggle === m.id}
                deleting={pendingDelete === m.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
