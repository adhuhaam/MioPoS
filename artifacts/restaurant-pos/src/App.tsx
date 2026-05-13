import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import { SidebarLayout } from "./components/layout/sidebar";

import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Outlets from "./pages/outlets";
import Menu from "./pages/menu";
import Tables from "./pages/tables";
import POS from "./pages/pos";
import Kitchen from "./pages/kitchen";
import Orders from "./pages/orders";
import Reports from "./pages/reports";
import Staff from "./pages/staff";
import Settings from "./pages/settings";
import Customers from "./pages/customers";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function KitchenRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/kitchen"); }, [setLocation]);
  return null;
}

function Router() {
  const { auth } = useAuth();
  const role = auth?.staff.role;

  if (!auth) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <SidebarLayout>
      <Switch>
        <Route path="/" component={role === "kitchen" ? KitchenRedirect : Dashboard} />
        {role === "super_admin" && <Route path="/outlets" component={Outlets} />}
        {(role === "super_admin" || role === "manager") && <Route path="/menu" component={Menu} />}
        {(role === "super_admin" || role === "manager" || role === "cashier") && <Route path="/tables" component={Tables} />}
        {(role === "super_admin" || role === "manager" || role === "cashier") && <Route path="/pos" component={POS} />}
        {(role === "super_admin" || role === "manager" || role === "kitchen") && <Route path="/kitchen" component={Kitchen} />}
        {(role === "super_admin" || role === "manager" || role === "cashier") && <Route path="/orders" component={Orders} />}
        {(role === "super_admin" || role === "manager") && <Route path="/reports" component={Reports} />}
        {(role === "super_admin" || role === "manager") && <Route path="/staff" component={Staff} />}
        {(role === "super_admin" || role === "manager") && <Route path="/settings" component={Settings} />}
        {(role === "super_admin" || role === "manager" || role === "cashier") && <Route path="/customers" component={Customers} />}
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
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
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
