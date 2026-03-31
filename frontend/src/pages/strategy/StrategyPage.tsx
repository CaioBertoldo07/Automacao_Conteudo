import { useState } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Target,
  Users,
  Megaphone,
  LayoutGrid,
  Calendar,
  MousePointerClick,
  FileImage,
  Video,
  BookImage,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  useMyStrategy,
  useGenerateStrategy,
  useApproveStrategy,
  useRejectStrategy,
} from "@/hooks/useStrategy";
import type { ContentStrategy, ContentType } from "@/types";

export function StrategyPage() {
  const { data: strategy, isLoading } = useMyStrategy();
  const generate = useGenerateStrategy();
  const approve = useApproveStrategy();
  const reject = useRejectStrategy();

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [apiError, setApiError] = useState("");

  const isGenerating = generate.isPending;

  const handleGenerate = async () => {
    setApiError("");
    try {
      await generate.mutateAsync();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(msg ?? "Erro ao gerar estratégia. Tente novamente.");
    }
  };

  const handleApprove = async () => {
    if (!strategy) return;
    setApiError("");
    try {
      await approve.mutateAsync(strategy.id);
    } catch {
      setApiError("Erro ao aprovar estratégia.");
    }
  };

  const handleReject = async () => {
    if (!strategy) return;
    setApiError("");
    try {
      await reject.mutateAsync({ id: strategy.id, reason: rejectionReason || undefined });
      setShowRejectForm(false);
      setRejectionReason("");
    } catch {
      setApiError("Erro ao reprovar estratégia.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estratégia de Conteúdo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerada pelo Claude com base no perfil da sua empresa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {strategy && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              loading={isGenerating}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regerar
            </Button>
          )}
          {!strategy && (
            <Button onClick={handleGenerate} loading={isGenerating}>
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Gerando estratégia..." : "Gerar estratégia"}
            </Button>
          )}
        </div>
      </div>

      {apiError && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-20 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-base font-medium text-foreground">Gerando estratégia com IA...</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Isso pode levar alguns segundos. O Claude está analisando sua empresa.
          </p>
        </div>
      )}

      {!isGenerating && !strategy && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Sparkles className="mb-4 h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-base font-medium text-foreground">Nenhuma estratégia gerada ainda</p>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Clique em "Gerar estratégia" para o Claude criar um plano personalizado para sua empresa.
          </p>
          <Button onClick={handleGenerate}>
            <Sparkles className="h-4 w-4" />
            Gerar estratégia
          </Button>
        </div>
      )}

      {!isGenerating && strategy && (
        <div className="space-y-6">
          <StatusAndActions
            strategy={strategy}
            showRejectForm={showRejectForm}
            rejectionReason={rejectionReason}
            onApprove={handleApprove}
            onRejectClick={() => setShowRejectForm(true)}
            onRejectCancel={() => { setShowRejectForm(false); setRejectionReason(""); }}
            onRejectConfirm={handleReject}
            onReasonChange={setRejectionReason}
            approving={approve.isPending}
            rejecting={reject.isPending}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Resumo da estratégia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {strategy.content.summary}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard
              icon={<Target className="h-4 w-4" />}
              title="Objetivos de negócio"
            >
              <ul className="space-y-1.5">
                {strategy.content.businessGoals.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {g}
                  </li>
                ))}
              </ul>
            </InfoCard>

            <InfoCard icon={<Users className="h-4 w-4" />} title="Público-alvo">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {strategy.content.targetAudience}
              </p>
            </InfoCard>

            <InfoCard icon={<Megaphone className="h-4 w-4" />} title="Tom da marca">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {strategy.content.brandTone}
              </p>
            </InfoCard>

            <InfoCard icon={<LayoutGrid className="h-4 w-4" />} title="Pilares de conteúdo">
              <ul className="space-y-1.5">
                {strategy.content.contentPillars.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                    {p}
                  </li>
                ))}
              </ul>
            </InfoCard>

            <InfoCard icon={<Calendar className="h-4 w-4" />} title="Cadência de posts">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {strategy.content.postingCadence}
              </p>
            </InfoCard>

            <InfoCard icon={<MousePointerClick className="h-4 w-4" />} title="CTA principal">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {strategy.content.primaryCTA}
              </p>
            </InfoCard>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Ideias de posts ({strategy.content.postIdeas.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {strategy.content.postIdeas.map((idea, i) => (
                <PostIdeaCard key={i} idea={idea} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function StatusBadge({ status }: { status: ContentStrategy["approvalStatus"] }) {
  const map = {
    PENDING_APPROVAL: {
      label: "Aguardando aprovação",
      icon: <Clock className="h-3.5 w-3.5" />,
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    },
    APPROVED: {
      label: "Aprovada",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
    REJECTED: {
      label: "Reprovada",
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  } as const;

  const { label, icon, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}

interface StatusAndActionsProps {
  strategy: ContentStrategy;
  showRejectForm: boolean;
  rejectionReason: string;
  onApprove: () => void;
  onRejectClick: () => void;
  onRejectCancel: () => void;
  onRejectConfirm: () => void;
  onReasonChange: (v: string) => void;
  approving: boolean;
  rejecting: boolean;
}

function StatusAndActions({
  strategy,
  showRejectForm,
  rejectionReason,
  onApprove,
  onRejectClick,
  onRejectCancel,
  onRejectConfirm,
  onReasonChange,
  approving,
  rejecting,
}: StatusAndActionsProps) {
  const isPending = strategy.approvalStatus === "PENDING_APPROVAL";

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={strategy.approvalStatus} />
            <span className="text-xs text-muted-foreground">
              Gerada em {new Date(strategy.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
          {isPending && !showRejectForm && (
            <div className="flex gap-2">
              <Button size="sm" onClick={onApprove} loading={approving}>
                <ThumbsUp className="h-3.5 w-3.5" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onRejectClick}
                className="hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-colors"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                Reprovar
              </Button>
            </div>
          )}
        </div>

        {strategy.approvalStatus === "REJECTED" && strategy.rejectionReason && (
          <p className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            Motivo: {strategy.rejectionReason}
          </p>
        )}

        {showRejectForm && (
          <div className="mt-4 space-y-3">
            <textarea
              placeholder="Motivo da reprovação (opcional)..."
              value={rejectionReason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={onRejectConfirm}
                loading={rejecting}
              >
                Confirmar reprovação
              </Button>
              <Button size="sm" variant="outline" onClick={onRejectCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const FORMAT_CONFIG: Record<ContentType, { label: string; icon: React.ReactNode; className: string }> = {
  IMAGE: {
    label: "Imagem",
    icon: <FileImage className="h-3 w-3" />,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  REEL: {
    label: "Reel",
    icon: <Video className="h-3 w-3" />,
    className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  STORY: {
    label: "Story",
    icon: <BookImage className="h-3 w-3" />,
    className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
};

function PostIdeaCard({
  idea,
  index,
}: {
  idea: ContentStrategy["content"]["postIdeas"][number];
  index: number;
}) {
  const fmt = FORMAT_CONFIG[idea.format];

  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${fmt.className}`}
        >
          {fmt.icon}
          {fmt.label}
        </span>
      </div>

      <h3 className="mb-2 text-sm font-semibold leading-snug text-foreground">{idea.title}</h3>

      <div className="mb-3 rounded-md bg-primary/5 px-3 py-2">
        <p className="text-xs font-medium text-primary">{idea.hook}</p>
      </div>

      <p className="mb-3 flex-1 text-xs leading-relaxed text-muted-foreground">
        {idea.description}
      </p>

      <div className="space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/70">Objetivo: </span>
          {idea.objective}
        </div>
        <div>
          <span className="font-medium text-foreground/70">CTA: </span>
          {idea.cta}
        </div>
      </div>
    </div>
  );
}
