import { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useMyCalendar, useGenerateCalendar, useDeleteCalendarEntry } from "@/hooks/useCalendar";
import type { CalendarEntry, ContentType } from "@/types";

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

  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const [apiError, setApiError] = useState("");

  const handleGenerate = async () => {
    setApiError("");
    try {
      await generate.mutateAsync();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(msg ?? "Erro ao gerar calendário. Certifique-se de que a estratégia está aprovada.");
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
        <Button onClick={handleGenerate} loading={generate.isPending} variant="outline" size="sm">
          <RefreshCw className="h-3.5 w-3.5" />
          {entries.length > 0 ? "Regen. calendário" : "Gerar calendário"}
        </Button>
      </div>

      {apiError && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {apiError}
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
              {(Object.entries(TYPE_CONFIG) as [ContentType, typeof TYPE_CONFIG[ContentType]][]).map(
                ([type, cfg]) => (
                  <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.label}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Sidebar — entry detail or list */}
          <div className="space-y-4">
            {selected ? (
              <EntryDetail
                entry={selected}
                onClose={() => setSelected(null)}
                onDelete={handleDelete}
                deleting={remove.isPending}
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

/* ─── Entry detail panel ─────────────────────────────────────── */

function EntryDetail({
  entry,
  onClose,
  onDelete,
  deleting,
}: {
  entry: CalendarEntry;
  onClose: () => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const cfg = TYPE_CONFIG[entry.type];

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
        {entry.post && (
          <div>
            <p className="text-xs font-medium text-foreground/70">Legenda</p>
            <p className="line-clamp-3 text-sm text-muted-foreground">{entry.post.caption}</p>
          </div>
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
  const upcoming = entries
    .filter((e) => new Date(e.date) >= new Date())
    .slice(0, 8);

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
