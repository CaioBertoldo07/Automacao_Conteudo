import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Mail, Lock, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/api";

type Mode = "login" | "register";

export function LoginPage() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data =
        mode === "login"
          ? await authService.login({ email: form.email, password: form.password })
          : await authService.register({ email: form.email, password: form.password, name: form.name });

      saveSession(data);
      navigate("/dashboard");
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">

      {/* Glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[560px] w-[560px] rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute -bottom-24 -right-24 h-[560px] w-[560px] rounded-full bg-secondary/20 blur-[130px]" />
        <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-[410px]">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-xl shadow-primary/40 ring-1 ring-black/10 dark:ring-white/10">
            <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[2rem] font-bold tracking-tight text-foreground">
            AutoConteúdo
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Automatize seu Instagram com inteligência
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] p-8 shadow-2xl backdrop-blur-2xl">

          {/* Tabs */}
          <div className="mb-7 flex rounded-xl bg-black/[0.04] dark:bg-white/[0.06] p-1 ring-1 ring-black/10 dark:ring-white/[0.08]">
            <TabButton active={mode === "login"} onClick={() => switchMode("login")}>
              Entrar
            </TabButton>
            <TabButton active={mode === "register"} onClick={() => switchMode("register")}>
              Criar conta
            </TabButton>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name — register only */}
            {mode === "register" && (
              <FieldWrapper label="Nome" htmlFor="name">
                <IconInput
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={handleChange}
                  icon={<User className="h-4 w-4" />}
                />
              </FieldWrapper>
            )}

            {/* Email */}
            <FieldWrapper label="E-mail" htmlFor="email">
              <IconInput
                id="email"
                name="email"
                type="email"
                placeholder="user@gmail.com"
                value={form.email}
                onChange={handleChange}
                required
                icon={<Mail className="h-4 w-4" />}
              />
            </FieldWrapper>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground/80">
                  Senha
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="text-xs text-primary/80 transition-colors hover:text-primary"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <IconInput
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                icon={<Lock className="h-4 w-4" />}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:brightness-110 hover:shadow-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                mode === "login" ? "Entrar" : "Criar conta"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.08]" />
            <span className="text-xs text-muted-foreground">OU</span>
            <div className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.08]" />
          </div>

          {/* Google */}
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] text-sm font-medium text-foreground/70 transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-foreground"
          >
            <GoogleIcon />
            Continuar com Google
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Internal components ─────────────────────────────────── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FieldWrapper({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground/80">
        {label}
      </label>
      {children}
    </div>
  );
}

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
}

function IconInput({ icon, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        className={`h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/50 focus:bg-black/[0.05] dark:focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-primary/20 ${className ?? ""}`}
        {...props}
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57954C10.3214 3.57954 11.5077 4.03363 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16272 6.65591 3.57954 9 3.57954Z" fill="#EA4335"/>
    </svg>
  );
}
