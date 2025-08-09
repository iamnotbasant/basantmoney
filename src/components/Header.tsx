import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Wallet, CreditCard, PiggyBank, Target, BarChart3, Settings, Menu, X, LogOut, User, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

const Header = () => {
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
    { path: "/", label: "Vault", icon: Wallet },
    { path: "/transactions", label: "Transactions", icon: CreditCard },
    { path: "/budgets", label: "Budget", icon: PiggyBank },
    { path: "/reports", label: "Analytics", icon: BarChart3 },
    { path: "/wallets", label: "Wallets", icon: Wallet },
    { path: "/financial-goals", label: "Goals", icon: Target },
    { path: "/payments", label: "Payments", icon: TrendingUp },
  ];

  const getNavLinkClass = (path: string, isMobile = false) => {
    const isActive = location.pathname === path;
    let classes = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 select-none";
    
    if (isMobile) {
      classes += " w-full justify-start min-h-[44px]";
    }
    
    if (isActive) {
      classes += " bg-black text-white shadow-sm";
    } else {
      classes += " bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200";
    }
    return classes;
  };

  return (
    <div className="bg-white relative">
      {/* Desktop Navigation - Integrated Tab Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-4 relative">
          {/* Main Navigation Tabs - Centered */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={getNavLinkClass(item.path)}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Side Actions - Positioned Absolute */}
          <div className="absolute right-0 flex items-center gap-2">
            {/* User indicator (desktop) */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <User className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-600 max-w-20 truncate">
                {user?.email?.split('@')[0]}
              </span>
            </div>

            {/* Settings */}
            <button
              onClick={() => navigate("/settings")}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Logout */}
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200 shadow-lg">
          <nav className="px-4 py-3 space-y-1 max-h-96 overflow-y-auto">
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
            <div className="pt-2 mt-2 border-t border-gray-200 space-y-1">
              {/* User info (mobile) */}
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-600">
                <User className="h-4 w-4" />
                <span className="truncate">{user?.email}</span>
              </div>
              
              <button
                onClick={() => handleMobileNav("/settings")}
                className={`${getNavLinkClass("/settings", true)}`}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Header;
