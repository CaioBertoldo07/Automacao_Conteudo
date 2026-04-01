import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileImage,
  Calendar,
  Download,
  Zap,
  Building2,
  MapPin,
  Pencil,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useCompany";
import { useMyStrategy } from "@/hooks/useStrategy";
import { useDashboardStats } from "@/hooks/useContent";

export function DashboardPage() {
  const navigate = useNavigate();
  const { getUser } = useAuth();
  const user = getUser();

  const { data: company, isLoading } = useMyProfile();
  const { data: strategy } = useMyStrategy();
  const { data: stats } = useDashboardStats();

  // Redireciona para cadastro se não tiver empresa
  useEffect(() => {
    if (!isLoading && company === null) {
      navigate("/company/new");
    }
  }, [isLoading, company, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Derived generation status
  const isGenerating = (stats?.calendarProcessing ?? 0) > 0 || (stats?.activeJobs ?? 0) > 0;
  const hasFailed = (stats?.calendarFailed ?? 0) > 0;

  return (
    <div className="flex-1 overflow-auto p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {user?.name ?? "bem-vindo"}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {company
              ? `Gerenciando ${company.name} · ${company.niche}`
              : "Aqui está um resumo da sua automação de conteúdo."}
          </p>
        </div>

        {company && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/company/edit")}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar empresa
          </Button>
        )}
      </div>

      {/* ── 4 stat cards (one per Phase 7 block) ── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Block 1: Posts Gerados */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Posts Gerados</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {stats?.donePosts ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-background p-3 text-primary">
                <FileImage className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Block 2: Calendário */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calendário</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {stats?.calendarTotal ?? 0}
                </p>
                {(stats?.calendarPending ?? 0) > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {stats!.calendarPending} pendente{stats!.calendarPending !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-background p-3 text-secondary">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Block 3: Downloads */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Mídia</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {stats?.downloadsAvailable ?? 0}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">disponíveis para download</p>
              </div>
              <div className="rounded-lg bg-background p-3 text-accent">
                <Download className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Block 4: Status das Gerações */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jobs Ativos</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {stats?.activeJobs ?? 0}
                </p>
                {isGenerating && (
                  <p className="mt-0.5 text-xs text-blue-400">gerando…</p>
                )}
                {!isGenerating && hasFailed && (
                  <p className="mt-0.5 text-xs text-red-400">
                    {stats!.calendarFailed} com falha
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-background p-3 text-primary">
                <Zap
                  className={`h-5 w-5 ${isGenerating ? "text-blue-400" : hasFailed ? "text-red-400" : ""}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Empresa */}
        {company ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {company.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {company.city}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  {company.niche}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {company.postingFrequency} posts por mês programados
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {company.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Começar automação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Cadastre sua empresa para iniciar a geração automática de conteúdo para o
                Instagram.
              </p>
              <Button onClick={() => navigate("/company/new")}>
                <LayoutDashboard className="h-4 w-4" />
                Cadastrar empresa
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Estratégia de conteúdo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Estratégia de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strategy ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                      strategy.approvalStatus === "APPROVED"
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : strategy.approvalStatus === "REJECTED"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    }`}
                  >
                    {strategy.approvalStatus === "APPROVED"
                      ? "Aprovada"
                      : strategy.approvalStatus === "REJECTED"
                      ? "Reprovada"
                      : "Aguardando aprovação"}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {strategy.content.summary}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/strategy")}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Ver estratégia completa
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Sparkles className="mb-3 h-8 w-8 text-muted-foreground opacity-40" />
                <p className="mb-4 text-sm text-muted-foreground">
                  {company
                    ? "Gere uma estratégia de conteúdo personalizada com IA."
                    : "Cadastre sua empresa para gerar uma estratégia."}
                </p>
                {company && (
                  <Button size="sm" onClick={() => navigate("/strategy")}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Gerar estratégia
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status das Gerações — full width */}
        {stats && (stats.calendarTotal > 0 || stats.activeJobs > 0) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Status das Gerações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatusCell
                  label="Concluídos"
                  value={stats.donePosts}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  colorClass="text-green-500"
                  onClick={() => navigate("/content")}
                />
                <StatusCell
                  label="Processando"
                  value={stats.calendarProcessing}
                  icon={
                    <Loader2
                      className={`h-4 w-4 ${stats.calendarProcessing > 0 ? "animate-spin" : ""}`}
                    />
                  }
                  colorClass="text-blue-400"
                />
                <StatusCell
                  label="Pendentes"
                  value={stats.calendarPending}
                  icon={<Clock className="h-4 w-4" />}
                  colorClass="text-yellow-500"
                  onClick={() => navigate("/calendar")}
                />
                <StatusCell
                  label="Falharam"
                  value={stats.calendarFailed}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  colorClass="text-red-400"
                  onClick={stats.calendarFailed > 0 ? () => navigate("/calendar") : undefined}
                />
              </div>

              {stats.calendarTotal > 0 && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>
                      {stats.calendarDone} / {stats.calendarTotal} slots
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{
                        // calendarDone and calendarTotal share the same source (ContentCalendar),
                        // so the ratio is always ≤ 1. Math.min guards against any transient
                        // race during concurrent updates.
                        width: `${Math.min(100, Math.round((stats.calendarDone / stats.calendarTotal) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* REEL fallback notice — discrete, only when relevant */}
              {(stats.reelFallbackCount ?? 0) > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-500/80">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {stats.reelFallbackCount} REEL{stats.reelFallbackCount !== 1 ? "s" : ""} gerado{stats.reelFallbackCount !== 1 ? "s" : ""} como imagem (fallback)
                </p>
              )}

              {/* Idle indicator — visible only when no generation is active */}
              {!isGenerating && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/60">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  monitorando em segundo plano
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── StatusCell ─────────────────────────────────────────────── */

function StatusCell({
  label,
  value,
  icon,
  colorClass,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3">
      <div className={`flex items-center gap-1.5 text-xs font-medium ${colorClass}`}>
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-left transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        {content}
      </button>
    );
  }

  return content;
}
