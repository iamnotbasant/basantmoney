
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import IncomeEntry from "./pages/IncomeEntry";
import ExpenseEntry from "./pages/ExpenseEntry";
import Budgeting from "./pages/Budgeting";
import RecentTransactions from "./pages/RecentTransactions";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import FinancialGoals from "./pages/FinancialGoals";
import Settings from "./pages/Settings";
import Wallets from "./pages/Wallets";
import Payments from "./pages/Payments"; // Added Payments page
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/wallets" element={<ProtectedRoute><Wallets /></ProtectedRoute>} />
            <Route path="/income" element={<ProtectedRoute><IncomeEntry /></ProtectedRoute>} />
            <Route path="/expense" element={<ProtectedRoute><ExpenseEntry /></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><Budgeting /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/recent-transactions" element={<ProtectedRoute><RecentTransactions /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
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
);

export default App;
