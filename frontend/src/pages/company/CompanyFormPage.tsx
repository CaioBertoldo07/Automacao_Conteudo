import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Building2, MapPin, FileText, Megaphone, BarChart3, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useCreateCompany, useUpdateCompany, useMyProfile } from "@/hooks/useCompany";
import type { CreateCompanyRequest } from "@/types";

const TONE_OPTIONS = [
  "Informal e descontraído",
  "Profissional e sério",
  "Divertido e animado",
  "Elegante e sofisticado",
  "Próximo e acolhedor",
];

const FREQUENCY_OPTIONS = [
  { label: "4 posts / mês", value: 4 },
  { label: "8 posts / mês", value: 8 },
  { label: "12 posts / mês", value: 12 },
  { label: "20 posts / mês", value: 20 },
  { label: "30 posts / mês", value: 30 },
];

const EMPTY_FORM: CreateCompanyRequest = {
  name: "",
  niche: "",
  description: "",
  city: "",
  tone: TONE_OPTIONS[0],
  postingFrequency: 12,
};

export function CompanyFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname === "/company/edit";

  const { data: existingCompany, isLoading: loadingProfile } = useMyProfile();

  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany(existingCompany?.id ?? "");

  const [form, setForm] = useState<CreateCompanyRequest>(EMPTY_FORM);
  const [error, setError] = useState("");

  // Preenche o formulário ao editar
  useEffect(() => {
    if (isEdit && existingCompany) {
      setForm({
        name: existingCompany.name,
        niche: existingCompany.niche,
        description: existingCompany.description,
        city: existingCompany.city,
        tone: existingCompany.tone,
        postingFrequency: existingCompany.postingFrequency,
      });
    }
  }, [isEdit, existingCompany]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "postingFrequency" ? Number(value) : value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form);
      } else {
        await createMutation.mutateAsync(form);
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Ocorreu um erro. Tente novamente.");
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingProfile) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao dashboard
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? "Editar empresa" : "Cadastrar empresa"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit
              ? "Atualize as informações da sua empresa."
              : "Informe os dados da sua empresa para começar a automação de conteúdo."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Nome */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Nome da empresa
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ex: Doceria da Ana"
                    value={form.name}
                    onChange={handleChange}
                    required
                    minLength={2}
                    className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Nicho */}
              <Input
                id="niche"
                name="niche"
                label="Nicho / Segmento"
                placeholder="Ex: Doceria, Restaurante, Barbearia"
                value={form.niche}
                onChange={handleChange}
                required
              />

              {/* Descrição */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-sm font-medium text-foreground">
                  Descrição da empresa
                </label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Descreva brevemente sua empresa, produtos e diferenciais..."
                    value={form.description}
                    onChange={handleChange}
                    required
                    minLength={10}
                    rows={3}
                    className="w-full rounded-md border border-border bg-surface pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
              </div>

              {/* Cidade */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="city" className="text-sm font-medium text-foreground">
                  Cidade
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="city"
                    name="city"
                    type="text"
                    placeholder="Ex: São Paulo - SP"
                    value={form.city}
                    onChange={handleChange}
                    required
                    className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Tom */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tone" className="text-sm font-medium text-foreground">
                  Tom de comunicação
                </label>
                <div className="relative">
                  <Megaphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="tone"
                    name="tone"
                    value={form.tone}
                    onChange={handleChange}
                    className="h-10 w-full appearance-none rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {TONE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Frequência */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="postingFrequency" className="text-sm font-medium text-foreground">
                  Frequência de posts
                </label>
                <div className="relative">
                  <BarChart3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="postingFrequency"
                    name="postingFrequency"
                    value={form.postingFrequency}
                    onChange={handleChange}
                    className="h-10 w-full appearance-none rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {FREQUENCY_OPTIONS.map(({ label, value }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="flex-1 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-colors"
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={isLoading} className="flex-1">
                  {isEdit ? "Salvar alterações" : "Cadastrar empresa"}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
