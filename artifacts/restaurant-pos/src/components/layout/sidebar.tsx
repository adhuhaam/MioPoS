import { Link, useLocation } from "wouter";
import { useAuth } from "../../lib/auth";
import { useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Store,
  Menu,
  Armchair,
  TerminalSquare,
  ChefHat,
  History,
  FileText,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { auth, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  if (!auth) return <>{children}</>;

  const role = auth.staff.role;

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "manager", "cashier"] },
    { href: "/outlets", label: "Outlets", icon: Store, roles: ["super_admin"] },
    { href: "/menu", label: "Menu", icon: Menu, roles: ["super_admin", "manager"] },
    { href: "/tables", label: "Tables", icon: Armchair, roles: ["super_admin", "manager", "cashier"] },
    { href: "/pos", label: "POS", icon: TerminalSquare, roles: ["super_admin", "manager", "cashier"] },
    { href: "/kitchen", label: "Kitchen", icon: ChefHat, roles: ["super_admin", "manager", "kitchen"] },
    { href: "/orders", label: "Orders", icon: History, roles: ["super_admin", "manager", "cashier"] },
    { href: "/reports", label: "Reports", icon: FileText, roles: ["super_admin", "manager"] },
    { href: "/staff", label: "Staff", icon: Users, roles: ["super_admin", "manager"] },
    { href: "/settings", label: "Settings", icon: Settings, roles: ["super_admin", "manager"] },
  ].filter(link => link.roles.includes(role));

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
      }
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">ChainPOS</h1>
          <p className="text-xs text-sidebar-foreground/70 mt-1">{auth.outlet.name}</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location === link.href;
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80'}`}>
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-sm">
              {auth.staff.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{auth.staff.name}</p>
              <p className="text-xs text-sidebar-foreground/70 truncate capitalize">{role.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
