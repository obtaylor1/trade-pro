import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import BottomNavigation from "@/components/BottomNavigation";
import Sidebar from "@/components/Sidebar";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OnboardingPage from "@/pages/onboarding";
import AdminLoginPage from "@/pages/admin-login";
import { TradingModeProvider } from "@/contexts/TradingModeContext";

const HomePage = lazy(() => import("@/pages/home-command-center"));
const MarketsPage = lazy(() => import("@/pages/markets"));
const AISignalPage = lazy(() => import("@/pages/ai-signal"));
const NewsPage = lazy(() => import("@/pages/news"));
const LearnPage = lazy(() => import("@/pages/learn"));
const AccountPage = lazy(() => import("@/pages/account"));
const AccountCenterPage = lazy(() => import("@/pages/account-center"));
const SettingsPage = lazy(() => import("@/pages/settings-center"));
const AdminPage = lazy(() => import("@/pages/admin"));
const ConnectBrokerPage = lazy(() => import("@/pages/connect-broker"));
const AIManagedPage = lazy(() => import("@/pages/ai-managed"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageFallback() {
  return <div className="min-h-[50vh] grid place-items-center text-sm font-semibold text-slate-400" role="status">Loading page…</div>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0d1117" }}>
        <div className="text-center">
          <div className="text-3xl font-bold mb-2" style={{ color: "var(--color-blue)" }}>Trade Pro</div>
          <div className="text-sm" style={{ color: "var(--color-muted)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/admin-login" component={AdminLoginPage} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  if (!user.onboardingComplete) {
    return <OnboardingPage />;
  }

  return (
    <TradingModeProvider>
      <div className="app-shell flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen main-content page-dot-grid">
          <main className="flex-1 w-full min-h-screen">
            <Suspense fallback={<PageFallback />}>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/markets" component={MarketsPage} />
              <Route path="/connect-broker" component={ConnectBrokerPage} />
              <Route path="/ai-managed" component={AIManagedPage} />
              <Route path="/notifications" component={NotificationsPage} />
              <Route path="/ai-signal" component={AISignalPage} />
              <Route path="/news" component={NewsPage} />
              <Route path="/learn" component={LearnPage} />
              <Route path="/my-trades" component={AccountPage} />
              <Route path="/account" component={AccountCenterPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/admin">
                {user.isAdmin ? <AdminPage /> : <Redirect to="/" />}
              </Route>
              <Route path="/login"><Redirect to="/" /></Route>
              <Route path="/signup"><Redirect to="/" /></Route>
              <Route component={NotFound} />
            </Switch>
            </Suspense>
          </main>
        </div>
        <BottomNavigation />
      </div>
    </TradingModeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
