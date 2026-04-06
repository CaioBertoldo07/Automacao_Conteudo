import { useEffect, useState } from "react";
import {
  User,
  Lock,
  CheckCircle2,
  Loader2,
  Palette,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MediaUploader } from "@/components/ui/MediaUploader";
import { useMe, useUpdateMe, useChangePassword } from "@/hooks/useUser";
import { useMyProfile, useUpdateBrandProfile } from "@/hooks/useCompany";
import { useUploadMedia } from "@/hooks/useMedia";
import { useAutomationConfig, useUpdateAutomationConfig, useTriggerAutomation } from "@/hooks/useAutomation";

/* ─── Profile form ─────────────────��─────────────────────────── */

function ProfileCard() {
  const { data: user, isLoading } = useMe();
  const updateMe = useUpdateMe();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email);
    }
  }, [user]);

  const isDirty = user ? name !== (user.name ?? "") || email !== user.email : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    try {
      await updateMe.mutateAsync({ name: name || undefined, email });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao salvar. Tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Perfil
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Nome"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); setSuccess(false); }}
            placeholder="Seu nome"
            autoComplete="name"
          />
          <Input
            id="email"
            type="email"
            label="E-mail"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); setSuccess(false); }}
            placeholder="seu@email.com"
            autoComplete="email"
            required
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!isDirty || updateMe.isPending}>
              {updateMe.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
              ) : (
                "Salvar"
              )}
            </Button>
            {success && (
              <span className="flex items-center gap-1.5 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Salvo
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Password form ──────────────────────────────────────────── */

function PasswordCard() {
  const changePassword = useChangePassword();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (next !== confirm) {
      setError("A confirmação de senha não confere.");
      return;
    }
    if (next.length < 8) {
      setError("A nova senha precisa ter no mínimo 8 caracteres.");
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao alterar senha. Tente novamente.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Alterar senha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="current-password"
            type="password"
            label="Senha atual"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setError(""); setSuccess(false); }}
            autoComplete="current-password"
            required
          />
          <Input
            id="new-password"
            type="password"
            label="Nova senha"
            value={next}
            onChange={(e) => { setNext(e.target.value); setError(""); setSuccess(false); }}
            autoComplete="new-password"
            required
          />
          <Input
            id="confirm-password"
            type="password"
            label="Confirmar nova senha"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(""); setSuccess(false); }}
            autoComplete="new-password"
            required
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={!current || !next || !confirm || changePassword.isPending}
            >
              {changePassword.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Alterando…</>
              ) : (
                "Alterar senha"
              )}
            </Button>
            {success && (
              <span className="flex items-center gap-1.5 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Senha alterada
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Branding profile section ────────────────────────────────── */

const VISUAL_STYLES = ["minimalista", "vibrante", "profissional", "elegante"] as const;

function BrandingCard({ companyId }: { companyId: string }) {
  const { data: profile } = useMyProfile();
  const updateBrand = useUpdateBrandProfile(companyId);

  const bp = profile?.brandProfile;

  const uploadLogoMedia = useUploadMedia(companyId);

  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [mainProducts, setMainProducts] = useState("");
  const [communicationStyle, setCommunicationStyle] = useState("");
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (bp) {
      setDescription(bp.description ?? "");
      setTargetAudience(bp.targetAudience ?? "");
      setMainProducts(bp.mainProducts ?? "");
      setCommunicationStyle(bp.communicationStyle ?? "");
      setBrandColors(bp.brandColors ?? []);
      setVisualStyle(bp.visualStyle ?? "");
    }
  }, [bp]);

  async function handleLogoUpload(file: File) {
    const media = await uploadLogoMedia.mutateAsync(file);
    await updateBrand.mutateAsync({ logoUrl: media.url });
  }

  function addColor() {
    const hex = colorInput.trim();
    if (/^#[0-9A-Fa-f]{3,6}$/.test(hex) && !brandColors.includes(hex)) {
      setBrandColors([...brandColors, hex]);
      setColorInput("");
    }
  }

  function removeColor(c: string) {
    setBrandColors(brandColors.filter((x) => x !== c));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    try {
      await updateBrand.mutateAsync({
        description: description || undefined,
        targetAudience: targetAudience || undefined,
        mainProducts: mainProducts || undefined,
        communicationStyle: communicationStyle || undefined,
        brandColors: brandColors.length > 0 ? brandColors : undefined,
        visualStyle: (visualStyle as typeof VISUAL_STYLES[number]) || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao salvar perfil de marca.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Perfil de Branding
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="bp-description"
            label="Descrição da marca"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva sua marca..."
          />
          <Input
            id="bp-audience"
            label="Público-alvo"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="Ex: jovens de 18-30 anos interessados em..."
          />
          <Input
            id="bp-products"
            label="Principais produtos / serviços"
            value={mainProducts}
            onChange={(e) => setMainProducts(e.target.value)}
            placeholder="Ex: bolos artesanais, tortas, doces finos"
          />
          <Input
            id="bp-comm"
            label="Estilo de comunicação"
            value={communicationStyle}
            onChange={(e) => setCommunicationStyle(e.target.value)}
            placeholder="Ex: descontraído, próximo, informal"
          />
          {/* Logo upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Logotipo</label>
            {bp?.logoUrl && (
              <div className="flex items-center gap-3 rounded-lg border border-border p-2 bg-surface w-fit">
                <img
                  src={bp.logoUrl}
                  alt="Logo atual"
                  className="h-12 w-12 object-contain rounded"
                />
                <span className="text-xs text-muted-foreground">Logo atual</span>
              </div>
            )}
            <MediaUploader
              accept="image/jpeg,image/png,image/webp"
              onUpload={handleLogoUpload}
            />
          </div>

          {/* Brand colors */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cores da marca</label>
            <div className="flex gap-2">
              <Input
                id="bp-color-input"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                placeholder="#7C3AED"
                className="flex-1"
              />
              <Button type="button" onClick={addColor} className="shrink-0">
                Adicionar
              </Button>
            </div>
            {brandColors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {brandColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => removeColor(c)}
                    className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs hover:border-red-500 hover:text-red-400 transition-colors"
                    title="Remover cor"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: c }}
                    />
                    {c}
                    <span className="text-muted-foreground">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visual style */}
          <div className="space-y-1.5">
            <label htmlFor="bp-style" className="text-sm font-medium text-foreground">
              Estilo visual
            </label>
            <select
              id="bp-style"
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Selecionar...</option>
              {VISUAL_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateBrand.isPending}>
              {updateBrand.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
              ) : (
                "Salvar"
              )}
            </Button>
            {success && (
              <span className="flex items-center gap-1.5 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Salvo
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Toggle helper ──────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/* ─── Automation card ─────────────────────────────────────────── */

function AutomationCard() {
  const { data: config, isLoading } = useAutomationConfig();
  const updateConfig = useUpdateAutomationConfig();
  const trigger = useTriggerAutomation();

  const [enabled, setEnabled] = useState(false);
  const [autoGenerateContent, setAutoGenerateContent] = useState(true);
  const [autoRefillCalendar, setAutoRefillCalendar] = useState(true);
  const [threshold, setThreshold] = useState(7);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [triggerSuccess, setTriggerSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setAutoGenerateContent(config.autoGenerateContent);
      setAutoRefillCalendar(config.autoRefillCalendar);
      setThreshold(config.calendarRefillThreshold);
    }
  }, [config]);

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    try {
      await updateConfig.mutateAsync({
        enabled,
        autoGenerateContent,
        autoRefillCalendar,
        calendarRefillThreshold: threshold,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao salvar configurações.");
    }
  };

  const handleTrigger = async () => {
    try {
      await trigger.mutateAsync();
      setTriggerSuccess(true);
      setTimeout(() => setTriggerSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Erro ao acionar automação.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Automação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <Toggle
            checked={enabled}
            onChange={setEnabled}
            label="Ativar automação"
            description="Permite que o sistema gere e recomponha conteúdo automaticamente."
          />

          <div className="border-t border-border pt-4 space-y-4">
            <Toggle
              checked={autoGenerateContent}
              onChange={setAutoGenerateContent}
              label="Gerar conteúdo automaticamente"
              description="Enfileira posts pendentes com até 24h de antecedência."
            />

            <Toggle
              checked={autoRefillCalendar}
              onChange={setAutoRefillCalendar}
              label="Recompor calendário automaticamente"
              description="Regenera o calendário quando há poucos posts pendentes."
            />

            <div className="space-y-1.5">
              <label htmlFor="threshold" className="text-sm font-medium text-foreground">
                Dias de antecedência para recompor
              </label>
              <p className="text-xs text-muted-foreground">
                Recompõe o calendário se houver menos de 3 posts pendentes nos próximos N dias.
              </p>
              <Input
                id="threshold"
                type="number"
                value={String(threshold)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 30) setThreshold(v);
                }}
                min="1"
                max="30"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
              ) : (
                "Salvar"
              )}
            </Button>

            <Button
              type="button"
              onClick={handleTrigger}
              disabled={trigger.isPending}
              className="bg-muted text-foreground hover:bg-muted/80"
            >
              {trigger.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Acionando…</>
              ) : (
                "Acionar agora"
              )}
            </Button>

            {success && (
              <span className="flex items-center gap-1.5 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Salvo
              </span>
            )}
            {triggerSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Ciclo iniciado
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export function SettingsPage() {
  const { data: profile } = useMyProfile();
  const companyId = profile?.id;

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus dados de acesso e o perfil de marca da empresa.
          </p>
        </div>

        <div className="space-y-6">
          <ProfileCard />
          <PasswordCard />

          {companyId && <BrandingCard companyId={companyId} />}
          <AutomationCard />
        </div>
      </div>
    </div>
  );
}
