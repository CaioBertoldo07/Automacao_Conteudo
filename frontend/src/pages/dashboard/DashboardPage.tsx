import { LayoutDashboard, FileImage, Calendar, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

const stats = [
  { label: "Posts Gerados", value: "0", icon: FileImage, color: "text-primary" },
  { label: "Agendados", value: "0", icon: Calendar, color: "text-secondary" },
  { label: "Publicados", value: "0", icon: TrendingUp, color: "text-accent" },
  { label: "Jobs Ativos", value: "0", icon: Zap, color: "text-primary" },
];

export function DashboardPage() {
  const { getUser } = useAuth();
  const user = getUser();

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user?.name ?? "bem-vindo"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está um resumo da sua automação de conteúdo.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
                </div>
                <div className={`rounded-lg bg-surface p-3 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Começar automação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Cadastre sua empresa para iniciar a geração automática de conteúdo para o
              Instagram.
            </p>
            <Button>
              <LayoutDashboard className="h-4 w-4" />
              Cadastrar empresa
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="mb-2 h-8 w-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade ainda. Cadastre sua empresa para começar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
