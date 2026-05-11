import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import BooksPage from "@/pages/books";
import PublishersPage from "@/pages/publishers";
import StudentsPage from "@/pages/students";
import OrdersPage from "@/pages/orders";
import LendingPage from "@/pages/lending";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (adminOnly && user?.role !== "admin") return <Redirect to="/dashboard" />;
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Component />
      </main>
    </div>
  );
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Redirect to="/dashboard" />;
  return <Component />;
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={() => <AuthRoute component={LoginPage} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/books" component={() => <ProtectedRoute component={BooksPage} />} />
      <Route path="/publishers" component={() => <ProtectedRoute component={PublishersPage} adminOnly />} />
      <Route path="/students" component={() => <ProtectedRoute component={StudentsPage} adminOnly />} />
      <Route path="/orders" component={() => <ProtectedRoute component={OrdersPage} />} />
      <Route path="/lending" component={() => <ProtectedRoute component={LendingPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route component={RootRedirect} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
