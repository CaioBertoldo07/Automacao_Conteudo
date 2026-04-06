import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  FileImage,
  Images,
  Settings,
  LogOut,
  Zap,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext } from "@/App";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/strategy", icon: Sparkles, label: "Estratégia" },
  { to: "/calendar", icon: Calendar, label: "Calendário" },
  { to: "/content", icon: FileImage, label: "Conteúdo" },
  { to: "/media", icon: Images, label: "Biblioteca" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export function Sidebar() {
  const { logout, getUser } = useAuth();
  const user = getUser();
  const { theme, toggleTheme } = useThemeContext();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-secondary">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-foreground">AutoConteúdo</span>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-semibold">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name ?? "Usuário"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
