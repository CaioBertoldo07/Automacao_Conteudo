import { useEffect, useState } from "react";
import { User, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useMe, useUpdateMe, useChangePassword } from "@/hooks/useUser";

/* ─── Profile form ───────────────────────────────────────────── */

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

/* ─── Page ───────────────────────────────────────────────────── */

export function SettingsPage() {
  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus dados de acesso.
          </p>
        </div>

        <div className="space-y-6">
          <ProfileCard />
          <PasswordCard />
        </div>
      </div>
    </div>
  );
}
