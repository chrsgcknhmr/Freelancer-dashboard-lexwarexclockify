import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { Layout } from "@/components/layout";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import TimeAnalysisPage from "@/pages/time-analysis";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/time" component={TimeAnalysisPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
