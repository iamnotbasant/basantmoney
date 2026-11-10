import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CreditCard, PiggyBank, Target, BarChart3, Settings, Menu, X, LogOut, User, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileNav = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You've been logged out of your account.",
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { path: "/", label: "Vault", icon: PiggyBank },
    { path: "/transactions", label: "Transactions", icon: CreditCard },
    { path: "/reports", label: "Analytics", icon: BarChart3 },
    { path: "/financial-goals", label: "Goals", icon: Target },
    { path: "/payments", label: "Payments", icon: TrendingUp },
  ];

  const getNavLinkClass = (path: string, isMobile = false) => {
    const isActive = location.pathname === path;
    const base = "inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg";

    if (isMobile) {
      return [
        base,
        "w-full justify-start min-h-[44px] px-4",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      ].join(" ");
    }

    return [
      base,
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    ].join(" ");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand mark */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shadow-primary/20">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight leading-none text-foreground">
                BasantMoney
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                BANK LEDGER
              </span>
            </div>
          </div>

          {/* Center: Main Navigation Tabs */}
          <nav aria-label="Primary" className="hidden md:inline-flex items-center gap-1 rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-1 shadow-sm">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  aria-current={location.pathname === item.path ? "page" : undefined}
                  className={getNavLinkClass(item.path)}
                  type="button"
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* User chip (desktop) */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-muted/60 border border-border/60 rounded-xl">
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center">
                <User className="h-3 w-3" />
              </div>
              <span className="text-xs font-medium text-foreground max-w-24 truncate">
                {user?.email?.split('@')[0] || 'User'}
              </span>
            </div>

            {/* Settings */}
            <button
              onClick={() => navigate("/settings")}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Logout */}
            <button
              onClick={handleSignOut}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border/60 bg-background/95 backdrop-blur-xl">
          <nav className="px-4 py-3 space-y-1.5 max-h-[calc(100vh-5rem)] overflow-y-auto">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleMobileNav(item.path)}
                  className={getNavLinkClass(item.path, true)}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 mt-2 border-t border-border/60 space-y-1">
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{user?.email || 'Logged in'}</span>
              </div>
              <button
                onClick={() => handleMobileNav("/settings")}
                className={getNavLinkClass("/settings", true)}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
