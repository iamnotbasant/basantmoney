import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Wallet, Settings, Menu, X, LogOut, User } from "lucide-react";
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
    { path: "/", label: "Vault" },
    { path: "/transactions", label: "Transactions" },
    { path: "/budgets", label: "Budget" },
    { path: "/reports", label: "Analytics" },
  ];

  const getNavLinkClass = (path: string, isMobile = false) => {
    const isActive = location.pathname === path;
    let classes =
      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 select-none";
    if (isMobile) {
      classes += " w-full text-left block min-h-[40px] flex items-center";
    }
    if (isActive) {
      classes += " bg-gray-900 text-white shadow-sm";
    } else {
      classes += " text-gray-600 hover:text-gray-900 hover:bg-gray-100";
    }
    return classes;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 safe-top">
      <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10 md:h-12">
          {/* Minimal Logo */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <div className="p-2 bg-gray-900 rounded-lg group-hover:bg-gray-800 transition-colors">
              <Wallet className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center">
            <div className="flex items-center space-x-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={getNavLinkClass(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Right Side Actions - Responsive */}
          <div className="flex items-center space-x-1 xs:space-x-2">
            {/* User indicator (desktop) */}
            <div className="hidden lg:flex items-center space-x-2">
              <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50 rounded-md">
                <User className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600 max-w-20 truncate">
                  {user?.email?.split('@')[0]}
                </span>
              </div>
            </div>

            {/* Settings (desktop + tablet) */}
            <button
              onClick={() => navigate("/settings")}
              className="hidden xs:flex p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors mobile-button"
              title="Settings"
              style={{ minHeight: '28px' }}
            >
              <Settings className="h-4 w-4 xs:h-4 xs:w-4 sm:h-[18px] sm:w-[18px]" />
            </button>

            {/* Logout (desktop) */}
            <button
              onClick={handleSignOut}
              className="hidden md:flex p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors mobile-button"
              title="Sign Out"
              style={{ minHeight: '28px' }}
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors mobile-button"
              aria-label="Toggle menu"
              style={{ minHeight: '28px' }}
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4 xs:h-4 xs:w-4 sm:h-[18px] sm:w-[18px]" />
              ) : (
                <Menu className="h-4 w-4 xs:h-4 xs:w-4 sm:h-[18px] sm:w-[18px]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg safe-bottom">
          <nav className="px-2 xs:px-3 pt-1 pb-3 space-y-0.5 max-h-[calc(100vh-3rem)] overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleMobileNav(item.path)}
                className={getNavLinkClass(item.path, true)}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-1 mt-1 border-t border-gray-200 space-y-0.5">
              {/* User info (mobile) */}
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-600">
                <User className="h-3 w-3" />
                <span className="truncate">{user?.email}</span>
              </div>
              
              <button
                onClick={() => handleMobileNav("/settings")}
                className={`${getNavLinkClass("/settings", true)} flex items-center gap-2`}
              >
                <Settings className="h-3 w-3" />
                <span>Settings</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full text-left block min-h-[40px] flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
              >
                <LogOut className="h-3 w-3" />
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
