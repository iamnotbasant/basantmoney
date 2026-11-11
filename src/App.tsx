
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import IncomeEntry from "./pages/IncomeEntry";
import ExpenseEntry from "./pages/ExpenseEntry";
import Transactions from "./pages/Transactions";
import FinancialGoals from "./pages/FinancialGoals";
import Settings from "./pages/Settings";
import Payments from "./pages/Payments"; // Added Payments page
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/wallets" element={<Navigate to="/" replace />} />
                <Route path="/income" element={<ProtectedRoute><IncomeEntry /></ProtectedRoute>} />
                <Route path="/expense" element={<ProtectedRoute><ExpenseEntry /></ProtectedRoute>} />
                
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/recent-transactions" element={<Navigate to="/transactions" replace />} />
                <Route path="/reports" element={<Navigate to="/analytics" replace />} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                <Route path="/financial-goals" element={<ProtectedRoute><FinancialGoals /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
