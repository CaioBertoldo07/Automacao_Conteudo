import { createContext, useContext } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/login/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { CompanyFormPage } from "@/pages/company/CompanyFormPage";
import { StrategyPage } from "@/pages/strategy/StrategyPage";
import { CalendarPage } from "@/pages/calendar/CalendarPage";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useTheme, type Theme } from "@/hooks/useTheme";

/* ── Theme context ──────────────────────────────────────────── */
interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

/* ── Layout helpers ─────────────────────────────────────────── */
function PrivateLayout({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/* ── App root ───────────────────────────────────────────────── */
export default function App() {
  const themeCtx = useTheme();

  return (
    <ThemeContext.Provider value={themeCtx}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateLayout>
              <DashboardPage />
            </PrivateLayout>
          }
        />
        <Route
          path="/company/new"
          element={
            <PrivateLayout>
              <CompanyFormPage />
            </PrivateLayout>
          }
        />
        <Route
          path="/company/edit"
          element={
            <PrivateLayout>
              <CompanyFormPage />
            </PrivateLayout>
          }
        />
        <Route
          path="/strategy"
          element={
            <PrivateLayout>
              <StrategyPage />
            </PrivateLayout>
          }
        />
        <Route
          path="/calendar"
          element={
            <PrivateLayout>
              <CalendarPage />
            </PrivateLayout>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ThemeContext.Provider>
  );
}
