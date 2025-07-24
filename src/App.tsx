
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/income" element={<IncomeEntry />} />
          <Route path="/expense" element={<ExpenseEntry />} />
          <Route path="/budgets" element={<Budgeting />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/recent-transactions" element={<RecentTransactions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payments" element={<Payments />} /> {/* Added Payments route */}
          <Route path="/financial-goals" element={<FinancialGoals />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
