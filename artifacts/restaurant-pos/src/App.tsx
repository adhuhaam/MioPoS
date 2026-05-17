import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import { SidebarLayout } from "./components/layout/sidebar";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { canManageTables, canOperateOrders, normalizeRole } from "./lib/roles";

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
import QrMenu from "./pages/qr-menu";
import PayOrder from "./pages/pay-order";
import Inventory from "./pages/inventory";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function KitchenRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/kitchen"); }, [setLocation]);
  return null;
}

function FloorStaffRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/pos"); }, [setLocation]);
  return null;
}

function RealtimeSync() {
  useRealtimeSync();
  return null;
}

function PrivateRouter() {
  const { auth } = useAuth();
  const role = auth?.staff.role ? normalizeRole(auth.staff.role) : "";

  if (!auth) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  const isKitchen = role === "kitchen";
  const isFloorStaff = role === "cashier" || role === "waiter";
  const home = isKitchen ? KitchenRedirect : isFloorStaff ? FloorStaffRedirect : Dashboard;

  return (
    <SidebarLayout>
      <RealtimeSync />
      <Switch>
        <Route path="/" component={home} />
        {role === "super_admin" && <Route path="/outlets" component={Outlets} />}
        {(role === "super_admin" || role === "manager") && <Route path="/menu" component={Menu} />}
        {canManageTables(role) && <Route path="/tables" component={Tables} />}
        {canOperateOrders(role) && <Route path="/pos" component={POS} />}
        {(role === "super_admin" || role === "manager" || role === "kitchen") && (
          <Route path="/kitchen" component={Kitchen} />
        )}
        {canOperateOrders(role) && <Route path="/orders" component={Orders} />}
        {(role === "super_admin" || role === "manager") && <Route path="/inventory" component={Inventory} />}
        {(role === "super_admin" || role === "manager") && <Route path="/reports" component={Reports} />}
        {(role === "super_admin" || role === "manager") && <Route path="/staff" component={Staff} />}
        {(role === "super_admin" || role === "manager") && <Route path="/settings" component={Settings} />}
        {canOperateOrders(role) && <Route path="/customers" component={Customers} />}
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/qr/:outletId" component={QrMenu} />
      <Route path="/pay/:orderId" component={PayOrder} />
      <Route>
        <AuthProvider>
          <PrivateRouter />
        </AuthProvider>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
