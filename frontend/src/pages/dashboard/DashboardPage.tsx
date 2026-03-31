import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileImage,
  Calendar,
  TrendingUp,
  Zap,
  Building2,
  MapPin,
  Pencil,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useCompany";
import { useMyStrategy } from "@/hooks/useStrategy";

const stats = [
  { label: "Posts Gerados", value: "0", icon: FileImage, color: "text-primary" },
  { label: "Agendados", value: "0", icon: Calendar, color: "text-secondary" },
  { label: "Publicados", value: "0", icon: TrendingUp, color: "text-accent" },
  { label: "Jobs Ativos", value: "0", icon: Zap, color: "text-primary" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { getUser } = useAuth();
  const user = getUser();

  const { data: company, isLoading } = useMyProfile();
  const { data: strategy } = useMyStrategy();

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

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
                </div>
                <div className={`rounded-lg bg-background p-3 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Card de empresa */}
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
      </div>
    </div>
  );
}
