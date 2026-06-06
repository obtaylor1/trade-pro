import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import BottomNavigation from "@/components/BottomNavigation";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OnboardingPage from "@/pages/onboarding";
import HomePage from "@/pages/home";
import MarketsPage from "@/pages/markets";
import AISignalPage from "@/pages/ai-signal";
import NewsPage from "@/pages/news";
import LearnPage from "@/pages/learn";
import AccountPage from "@/pages/account";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0d1117" }}>
        <div className="text-center">
          <div className="text-3xl font-bold mb-2" style={{ color: "#3b82f6" }}>Trade Pro</div>
          <div className="text-sm" style={{ color: "#64748b" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  if (!user.onboardingComplete) {
    return <OnboardingPage />;
  }

  return (
    <>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/markets" component={MarketsPage} />
        <Route path="/ai-signal" component={AISignalPage} />
        <Route path="/news" component={NewsPage} />
        <Route path="/learn" component={LearnPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/login"><Redirect to="/" /></Route>
        <Route path="/signup"><Redirect to="/" /></Route>
        <Route component={NotFound} />
      </Switch>
      <BottomNavigation />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
