import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import {
  Calendar,
  RefreshCw,
  Loader2,
  FileImage,
  Video,
  BookImage,
  Trash2,
  X,
  Sparkles,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useMyCalendar, useGenerateCalendar, useDeleteCalendarEntry } from "@/hooks/useCalendar";
import { useGenerateContent, useGenerateBatch } from "@/hooks/useContent";
import type { BatchEnqueueResult, CalendarEntry, ContentType } from "@/types";

const TYPE_CONFIG: Record<ContentType, { label: string; color: string; icon: React.ReactNode }> = {
  IMAGE: {
    label: "Imagem",
    color: "#3b82f6",
    icon: <FileImage className="h-3.5 w-3.5" />,
  },
  REEL: {
    label: "Reel",
    color: "#a855f7",
    icon: <Video className="h-3.5 w-3.5" />,
  },
  STORY: {
    label: "Story",
    color: "#f97316",
    icon: <BookImage className="h-3.5 w-3.5" />,
  },
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  DONE: "Concluído",
  FAILED: "Falhou",
};

export function CalendarPage() {
  const { data: entries = [], isLoading } = useMyCalendar();
  const generate = useGenerateCalendar();
  const remove = useDeleteCalendarEntry();
  const generateContent = useGenerateContent();
  const generateBatch = useGenerateBatch();

  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const [apiError, setApiError] = useState("");
  const [batchResult, setBatchResult] = useState<BatchEnqueueResult | null>(null);

  // Phase 6: Map of calendarEntryId → aiJobId for all in-flight jobs.
  // Supports multiple simultaneous generateOne calls without overwriting state.
  const [pendingJobs, setPendingJobs] = useState<Map<string, string>>(new Map());
  // Per-entry error messages surfaced after worker failure.
  const [jobErrors, setJobErrors] = useState<Map<string, string>>(new Map());

  // React to calendar entry status changes to clear pending jobs and collect errors.
  // Dependencies are explicit — no eslint-disable needed.
  useEffect(() => {
    if (pendingJobs.size === 0) return;

    const terminal = entries.filter(
      (e) => pendingJobs.has(e.id) && (e.status === "DONE" || e.status === "FAILED")
    );
    if (terminal.length === 0) return;

    // Remove completed entries from the pending map.
    setPendingJobs((prev) => {
      const next = new Map(prev);
      for (const e of terminal) next.delete(e.id);
      return next;
    });

    // If the currently selected entry just completed, update it.
    const doneSelected = terminal.find((e) => e.id === selected?.id);
    if (doneSelected) {
      setSelected(doneSelected);
    }

    // Collect per-entry error messages for FAILED entries.
    const failedEntries = terminal.filter((e) => e.status === "FAILED");
    if (failedEntries.length > 0) {
      setJobErrors((prev) => {
        const next = new Map(prev);
        for (const e of failedEntries) {
          next.set(e.id, "A geração falhou. Tente novamente.");
        }
        return next;
      });
    }
  }, [entries, pendingJobs, selected]);

  const pendingCount = entries.filter((e) => e.status === "PENDING").length;

  const handleGenerate = async () => {
    setApiError("");
    setBatchResult(null);
    try {
      await generate.mutateAsync();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(
        msg ?? "Erro ao gerar calendário. Certifique-se de que a estratégia está aprovada."
      );
    }
  };

  const handleDelete = async (id: string) => {
    setApiError("");
    try {
      await remove.mutateAsync(id);
      setSelected(null);
    } catch {
      setApiError("Erro ao remover entrada do calendário.");
    }
  };

  const handleGenerateContent = async (id: string) => {
    if (pendingJobs.has(id)) return; // already in flight for this entry
    setApiError("");
    setJobErrors((prev) => { const m = new Map(prev); m.delete(id); return m; });
    try {
      const { aiJobId } = await generateContent.mutateAsync(id);
      // 202 received — register this entry as in-flight.
      // useMyCalendar auto-polls via refetchInterval while entries are PROCESSING.
      setPendingJobs((prev) => new Map(prev).set(id, aiJobId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(msg ?? "Erro ao gerar conteúdo para este item.");
    }
  };

  const handleGenerateBatch = async () => {
    setApiError("");
    setBatchResult(null);
    try {
      const result = await generateBatch.mutateAsync();
      setBatchResult(result);
      // useMyCalendar auto-polls via refetchInterval while entries are PROCESSING.
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(msg ?? "Erro ao gerar conteúdo em lote.");
    }
  };

  const events = entries.map((entry) => ({
    id: entry.id,
    title: TYPE_CONFIG[entry.type].label,
    date: entry.date.slice(0, 10),
    backgroundColor: TYPE_CONFIG[entry.type].color,
    borderColor: TYPE_CONFIG[entry.type].color,
    textColor: "#ffffff",
    extendedProps: { entry },
  }));

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendário de Conteúdo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agenda de posts gerada a partir da estratégia aprovada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              onClick={handleGenerateBatch}
              loading={generateBatch.isPending}
              variant="outline"
              size="sm"
            >
              <Layers className="h-3.5 w-3.5" />
              Gerar lote ({pendingCount})
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            loading={generate.isPending}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {entries.length > 0 ? "Regen. calendário" : "Gerar calendário"}
          </Button>
        </div>
      </div>

      {apiError && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      {batchResult && (
        <div className="mb-6 space-y-1 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <p>
            {batchResult.queued}{" "}
            {batchResult.queued === 1 ? "item enfileirado" : "itens enfileirados"} — processamento em andamento.
            {batchResult.failed > 0 && (
              <span className="ml-2 text-yellow-400">
                {batchResult.failed} com falha.
              </span>
            )}
          </p>
          {batchResult.failed > 0 && (() => {
            const failedItems = batchResult.items.filter((i) => i.status === "failed");
            const shown = failedItems.slice(0, 3);
            const extra = failedItems.length - shown.length;
            return (
              <ul className="mt-1 space-y-0.5 text-xs text-yellow-400/80">
                {shown.map((item) => (
                  <li key={item.calendarEntryId} className="truncate">
                    · {item.calendarEntryId.slice(0, 8)}… — {item.error ?? "erro desconhecido"}
                  </li>
                ))}
                {extra > 0 && <li>· +{extra} {extra === 1 ? "falha adicional" : "falhas adicionais"}</li>}
              </ul>
            );
          })()}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Calendar className="mb-4 h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-base font-medium text-foreground">Nenhum post agendado</p>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Aprove sua estratégia de conteúdo e clique em "Gerar calendário".
          </p>
          <Button onClick={handleGenerate} loading={generate.isPending}>
            <Calendar className="h-4 w-4" />
            Gerar calendário
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Calendar */}
          <div className="xl:col-span-2">
            <Card>
              <CardContent className="p-4">
                <FullCalendarWrapper
                  events={events}
                  onEventClick={(entry) => setSelected(entry)}
                />
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              {(
                Object.entries(TYPE_CONFIG) as [ContentType, (typeof TYPE_CONFIG)[ContentType]][]
              ).map(([type, cfg]) => (
                <div
                  key={type}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cfg.color }}
                  />
                  {cfg.label}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {selected ? (
              <EntryDetail
                entry={selected}
                onClose={() => setSelected(null)}
                onDelete={handleDelete}
                deleting={remove.isPending}
                onGenerate={handleGenerateContent}
                generating={generateContent.isPending}
                isPolling={pendingJobs.has(selected.id)}
                jobError={jobErrors.get(selected.id)}
              />
            ) : (
              <UpcomingList entries={entries} onSelect={setSelected} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── FullCalendar wrapper ───────────────────────────────────── */

interface FCEvent {
  id: string;
  title: string;
  date: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: { entry: CalendarEntry };
}

function FullCalendarWrapper({
  events,
  onEventClick,
}: {
  events: FCEvent[];
  onEventClick: (entry: CalendarEntry) => void;
}) {
  return (
    <div className="fc-dark">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        events={events}
        eventClick={(info) => {
          const entry = (info.event.extendedProps as { entry: CalendarEntry }).entry;
          onEventClick(entry);
        }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
      />
    </div>
  );
}

/* ─── Media helpers ──────────────────────────────────────────── */

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

function isVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url, "http://x").pathname;
    const ext = pathname.slice(pathname.lastIndexOf(".")).toLowerCase();
    return VIDEO_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

function MediaPreview({
  mediaUrl,
  isReelFallback,
}: {
  mediaUrl: string;
  isReelFallback: boolean;
}) {
  const [videoError, setVideoError] = useState(false);
  const showVideo = isVideoUrl(mediaUrl) && !videoError;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-foreground/70">Mídia gerada</p>
      {showVideo ? (
        <video
          controls
          preload="metadata"
          className="w-full rounded-md object-cover"
          style={{ maxHeight: "260px" }}
          onError={() => setVideoError(true)}
        >
          <source src={mediaUrl} type="video/mp4" />
          Seu navegador não suporta reprodução de vídeo.
        </video>
      ) : (
        <>
          <img
            src={mediaUrl}
            alt="Mídia gerada"
            className="w-full rounded-md object-cover"
            style={{ maxHeight: "200px" }}
          />
          {isReelFallback && (
            <p className="mt-1 text-xs text-muted-foreground">
              Vídeo indisponível no momento. Exibindo imagem fallback.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Entry detail panel ─────────────────────────────────────── */

function EntryDetail({
  entry,
  onClose,
  onDelete,
  deleting,
  onGenerate,
  generating,
  isPolling,
  jobError,
}: {
  entry: CalendarEntry;
  onClose: () => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  onGenerate: (id: string) => void;
  generating: boolean;
  isPolling: boolean;
  jobError?: string;
}) {
  const cfg = TYPE_CONFIG[entry.type];
  const canGenerate = entry.status === "PENDING" || entry.status === "FAILED";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            {cfg.label}
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-foreground/70">Data</p>
          <p className="text-sm text-foreground">
            {new Date(entry.date).toLocaleDateString("pt-BR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground/70">Status</p>
          <p className="text-sm text-muted-foreground">{STATUS_LABEL[entry.status]}</p>
        </div>

        {entry.post?.caption && (
          <div>
            <p className="text-xs font-medium text-foreground/70">Legenda</p>
            <p className="line-clamp-4 text-sm text-muted-foreground">{entry.post.caption}</p>
          </div>
        )}

        {entry.post?.hashtags && (
          <div>
            <p className="text-xs font-medium text-foreground/70">Hashtags</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{entry.post.hashtags}</p>
          </div>
        )}

        {entry.post?.mediaUrl && (
          <MediaPreview
            mediaUrl={entry.post.mediaUrl}
            isReelFallback={entry.type === "REEL" && !isVideoUrl(entry.post.mediaUrl)}
          />
        )}

        <div className="flex flex-col gap-2 pt-1">
          {jobError && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {jobError}
            </p>
          )}
          {isPolling && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              Processando em background…
            </div>
          )}
          {canGenerate && !isPolling && (
            <Button
              size="sm"
              onClick={() => onGenerate(entry.id)}
              loading={generating}
              className="w-full"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gerar conteúdo
            </Button>
          )}
          {entry.status === "PENDING" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(entry.id)}
              loading={deleting}
              className="w-full"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover do calendário
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Upcoming list ──────────────────────────────────────────── */

function UpcomingList({
  entries,
  onSelect,
}: {
  entries: CalendarEntry[];
  onSelect: (entry: CalendarEntry) => void;
}) {
  const upcoming = entries.filter((e) => new Date(e.date) >= new Date()).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Próximos posts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum post futuro.</p>
        ) : (
          upcoming.map((entry) => {
            const cfg = TYPE_CONFIG[entry.type];
            return (
              <button
                key={entry.id}
                onClick={() => onSelect(entry)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: cfg.color }}
                >
                  {cfg.icon}
                </span>
                <div className="flex-1 truncate">
                  <p className="truncate text-sm font-medium text-foreground">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[entry.status]}</span>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
