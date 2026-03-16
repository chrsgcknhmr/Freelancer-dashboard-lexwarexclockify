import { Link, useLocation } from "wouter";
import { LayoutDashboard, Clock, Settings, Sun, Moon, Menu, X, Activity } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/time", label: "Zeitanalyse", icon: Clock },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];

function LogoSVG() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8" aria-label="FreelancePulse Logo">
      <rect x="2" y="2" width="28" height="28" rx="6" className="stroke-primary" strokeWidth="2" />
      <path d="M8 22V10l6 6 6-6v12" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="8" r="3" className="fill-chart-2" opacity="0.9" />
    </svg>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="layout-root">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-[220px] border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border">
          <LogoSVG />
          <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">FreelancePulse</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer
                    ${isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                >
                  <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-3">
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[260px] flex flex-col bg-sidebar border-r border-sidebar-border z-10">
            <div className="flex items-center justify-between px-5 h-14 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <LogoSVG />
                <span className="text-sm font-semibold text-sidebar-foreground">FreelancePulse</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer
                        ${isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 pb-3">
              <PerplexityAttribution />
            </div>
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              onClick={() => setMobileOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <LogoSVG />
              <span className="text-sm font-semibold">FreelancePulse</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-muted-foreground text-xs">
              <Activity size={14} />
              <span>Freelance Business Analytics</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              data-testid="button-theme-toggle"
              title={theme === "dark" ? "Helles Design" : "Dunkles Design"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link href="/settings">
              <div className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer" data-testid="link-settings">
                <Settings size={16} />
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
