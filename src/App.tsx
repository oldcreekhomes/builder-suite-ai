import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChatProvider } from "@/contexts/ChatContext";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { navItems } from "./nav-items";
import ProtectedRoute from "./components/ProtectedRoute";
import SidebarLayout from "./components/SidebarLayout";
import SharedPhoto from "./pages/SharedPhoto";
import SharedFolder from "./pages/SharedFolder";
import ProjectDashboard from "./pages/ProjectDashboard";
import ProjectPhotos from "./pages/ProjectPhotos";
import ProjectFiles from "./pages/ProjectFiles";
import ProjectBudget from "./pages/ProjectBudget";
import ProjectSchedule from "./pages/ProjectSchedule";
import ProjectBidding from "./pages/ProjectBidding";
import ProjectPurchaseOrders from "./pages/ProjectPurchaseOrders";
import TakeoffEditor from "./pages/TakeoffEditor";
import EstimatingAI from "./pages/EstimatingAI";
import Companies from "./pages/Companies";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Issues from "./pages/Issues";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import PasswordReset from "./pages/PasswordReset";
import Index from "./pages/Index";
import RootRoute from "./components/RootRoute";
import NotFound from "./pages/NotFound";
import Accounting from "./pages/Accounting";
import MarketplaceSignup from "./pages/MarketplaceSignup";
import MarketplacePortal from "./pages/MarketplacePortal";
import AboutUs from "./pages/AboutUs";
import FeatureAccounting from "./pages/features/Accounting";
import FeatureAIBillManagement from "./pages/features/AIBillManagement";
import FeatureGanttScheduling from "./pages/features/GanttScheduling";
import FeatureBidManagement from "./pages/features/BidManagement";
import FeatureDocumentManagement from "./pages/features/DocumentManagement";
import FeatureTeamCommunication from "./pages/features/TeamCommunication";
import FeatureJoinMarketplace from "./pages/features/JoinMarketplace";
import ApproveBills from "./pages/ApproveBills";
import ReviewBills from "./pages/ReviewBills";
import BalanceSheet from "./pages/BalanceSheet";
import IncomeStatement from "./pages/IncomeStatement";
import WriteChecks from "./pages/WriteChecks";
import MakeDeposits from "./pages/MakeDeposits";
import BankReconciliation from "./pages/BankReconciliation";
import JournalEntry from "./pages/JournalEntry";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import BidResponseConfirmation from "./pages/BidResponseConfirmation";
import ScheduleResponseConfirmation from "./pages/ScheduleResponseConfirmation";
import POResponseConfirmation from "./pages/POResponseConfirmation";
import BidSubmissionConfirmation from "./pages/BidSubmissionConfirmation";
import BidDeclined from "./pages/BidDeclined";
import SubmitBid from "./pages/SubmitBid";
import CloseBooks from "./pages/accounting/CloseBooks";
import OutboundRedirect from "./pages/OutboundRedirect";
import Marketplace from "./pages/Marketplace";
import React, { Suspense } from "react";
const Apartments = React.lazy(() => import("./pages/Apartments"));
import Templates from "./pages/Templates";
import SubcontractorContract from "./pages/templates/SubcontractorContract";
import SubcontractorContractEdit from "./pages/templates/SubcontractorContractEdit";
import { MarketplaceGuard } from "./components/guards/MarketplaceGuard";
import { TemplatesGuard } from "./components/guards/TemplatesGuard";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const AppContent = () => {
  console.log("[APP] AppContent rendering");

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
        <ChatProvider>
          <ImpersonationBanner />
          <Routes>
            {/* ===== PUBLIC ROUTES (no SidebarProvider) ===== */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/marketplace" element={<MarketplaceSignup />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/features/accounting" element={<FeatureAccounting />} />
            <Route path="/features/gantt-scheduling" element={<FeatureGanttScheduling />} />
            <Route path="/features/ai-bill-management" element={<FeatureAIBillManagement />} />
            <Route path="/features/bid-management" element={<FeatureBidManagement />} />
            <Route path="/features/document-management" element={<FeatureDocumentManagement />} />
            <Route path="/features/team-communication" element={<FeatureTeamCommunication />} />
            <Route path="/features/join-marketplace" element={<FeatureJoinMarketplace />} />
            <Route path="/reset-password" element={<PasswordReset />} />
            <Route path="/out" element={<OutboundRedirect />} />
            <Route path="/s/p/:shareId" element={<SharedPhoto />} />
            <Route path="/s/f/:shareId" element={<SharedFolder />} />
            <Route path="/bid-response-confirmation" element={<BidResponseConfirmation />} />
            <Route path="/schedule-response-confirmation" element={<ScheduleResponseConfirmation />} />
            <Route path="/po-response-confirmation" element={<POResponseConfirmation />} />
            <Route path="/submit-bid" element={<SubmitBid />} />
            <Route path="/bid-submission-confirmation" element={<BidSubmissionConfirmation />} />
            <Route path="/bid-declined" element={<BidDeclined />} />

            {/* ===== ROUTES WITH SIDEBAR ===== */}
            <Route element={<SidebarLayout />}>
              <Route path="/" element={<RootRoute />} />
              <Route path="/marketplace-portal" element={<ProtectedRoute><MarketplacePortal /></ProtectedRoute>} />
              <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
              <Route path="/accounting/bills/approve" element={<ProtectedRoute><ApproveBills /></ProtectedRoute>} />
              <Route path="/accounting/transactions/journal-entry" element={<ProtectedRoute><JournalEntry /></ProtectedRoute>} />
              <Route path="/accounting/reports/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
              <Route path="/accounting/reports/income-statement" element={<ProtectedRoute><IncomeStatement /></ProtectedRoute>} />
              <Route path="/accounting/banking/write-checks" element={<ProtectedRoute><WriteChecks /></ProtectedRoute>} />
              <Route path="/accounting/banking/make-deposits" element={<ProtectedRoute><MakeDeposits /></ProtectedRoute>} />
              <Route path="/estimating-ai" element={<ProtectedRoute><EstimatingAI /></ProtectedRoute>} />
              <Route path="/project/:projectId" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
              <Route path="/project/:projectId/photos" element={<ProtectedRoute><ProjectPhotos /></ProtectedRoute>} />
              <Route path="/project/:projectId/files" element={<ProtectedRoute><ProjectFiles /></ProtectedRoute>} />
              <Route path="/project/:projectId/estimate" element={<ProtectedRoute><TakeoffEditor /></ProtectedRoute>} />
              <Route path="/project/:projectId/budget" element={<ProtectedRoute><ProjectBudget /></ProtectedRoute>} />
              <Route path="/project/:projectId/bidding" element={<ProtectedRoute><ProjectBidding /></ProtectedRoute>} />
              <Route path="/project/:projectId/purchase-orders" element={<ProtectedRoute><ProjectPurchaseOrders /></ProtectedRoute>} />
              <Route path="/project/:projectId/schedule" element={<ProtectedRoute><ProjectSchedule /></ProtectedRoute>} />
              <Route path="/project/:projectId/estimating-ai" element={<ProtectedRoute><EstimatingAI /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/bills/review" element={<ProtectedRoute><ReviewBills /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/bills/approve" element={<ProtectedRoute><ApproveBills /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/transactions/journal-entry" element={<ProtectedRoute><JournalEntry /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/reports/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/reports/income-statement" element={<ProtectedRoute><IncomeStatement /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/banking/write-checks" element={<ProtectedRoute><WriteChecks /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/banking/make-deposits" element={<ProtectedRoute><MakeDeposits /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/banking/reconciliation" element={<ProtectedRoute><BankReconciliation /></ProtectedRoute>} />
              <Route path="/project/:projectId/accounting/close-books" element={<ProtectedRoute><CloseBooks /></ProtectedRoute>} />
              <Route path="/issues" element={<ProtectedRoute><Issues /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><TemplatesGuard><Templates /></TemplatesGuard></ProtectedRoute>} />
              <Route path="/templates/subcontractor-contract" element={<ProtectedRoute><TemplatesGuard><SubcontractorContract /></TemplatesGuard></ProtectedRoute>} />
              <Route path="/templates/subcontractor-contract/edit" element={<ProtectedRoute><TemplatesGuard><SubcontractorContractEdit /></TemplatesGuard></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><MarketplaceGuard><Marketplace /></MarketplaceGuard></ProtectedRoute>} />
              <Route path="/apartments" element={<ProtectedRoute><Suspense fallback={<div className="p-6">Loading...</div>}><Apartments /></Suspense></ProtectedRoute>} />
              <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              {navItems.map(({ to, page: Page }) => (
                <Route key={to} path={to} element={<ProtectedRoute><Page /></ProtectedRoute>} />
              ))}
            </Route>

            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ChatProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
