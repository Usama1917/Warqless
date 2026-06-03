import { Link, useRoute } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  Building2,
  Users,
  ShoppingCart,
  ArrowLeftRight,
  Settings,
  LogOut,
  BookMarked,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { labelKey: "books", href: "/books", icon: BookOpen, adminOnly: false },
  { labelKey: "publishers", href: "/publishers", icon: Building2, adminOnly: true },
  { labelKey: "students", href: "/students", icon: Users, adminOnly: true },
  { labelKey: "orders", href: "/orders", icon: ShoppingCart, adminOnly: false },
  { labelKey: "lending", href: "/lending", icon: ArrowLeftRight, adminOnly: true },
  { labelKey: "security", href: "/security", icon: ShieldAlert, adminOnly: true },
  { labelKey: "settings", href: "/settings", icon: Settings, adminOnly: false },
];

function NavItem({ label, href, icon: Icon, active }: { label: string; href: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span>{label}</span>
      </div>
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { t, isRTL } = useAdminLanguage();
  const [isDashboard] = useRoute("/dashboard");
  const [isBooks] = useRoute("/books");
  const [isPublishers] = useRoute("/publishers");
  const [isStudents] = useRoute("/students");
  const [isOrders] = useRoute("/orders");
  const [isLending] = useRoute("/lending");
  const [isSettings] = useRoute("/settings");
  const [isSecurity] = useRoute("/security");

  const activeMap: Record<string, boolean> = {
    "/dashboard": isDashboard,
    "/books": isBooks,
    "/publishers": isPublishers,
    "/students": isStudents,
    "/orders": isOrders,
    "/lending": isLending,
    "/security": isSecurity,
    "/settings": isSettings,
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  return (
    <aside className={cn("w-60 shrink-0 flex flex-col h-screen bg-sidebar border-sidebar-border", isRTL ? "border-l" : "border-r")}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <BookMarked size={16} className="text-sidebar-primary-foreground" />
        </div>
        <div>
          <div className="text-sidebar-foreground font-bold text-sm tracking-tight">{t.app.name}</div>
          <div className="text-sidebar-foreground/50 text-xs">
            {user?.role === "publisher" ? t.app.publisherPanel : t.app.panel}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavItem
            key={item.href}
            label={t.nav[item.labelKey as keyof typeof t.nav]}
            href={item.href}
            icon={item.icon}
            active={activeMap[item.href] ?? false}
          />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-bold shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sidebar-foreground text-sm font-medium truncate">{user?.name}</div>
            <div className="text-sidebar-foreground/50 text-xs capitalize">
              {user?.role ? t.roles[user.role] : ""}
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            title={t.common.signOut}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
