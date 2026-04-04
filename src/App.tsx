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
import ScrollToTop from "./components/ScrollToTop";
import React, { Suspense } from "react";

console.log("[APP] App.tsx module loaded");

// Inline loading fallback (no external dependency)
const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <p className="text-muted-foreground text-sm">Loading...</p>
  </div>
);

// Lazy-load ALL route pages to minimize the startup import graph
const RootRoute = React.lazy(() => import("./components/RootRoute"));
const SharedPhoto = React.lazy(() => import("./pages/SharedPhoto"));
const SharedFolder = React.lazy(() => import("./pages/SharedFolder"));
const ProjectDashboard = React.lazy(() => import("./pages/ProjectDashboard"));
const ProjectPhotos = React.lazy(() => import("./pages/ProjectPhotos"));
const ProjectFiles = React.lazy(() => import("./pages/ProjectFiles"));
const ProjectBudget = React.lazy(() => import("./pages/ProjectBudget"));
const ProjectSchedule = React.lazy(() => import("./pages/ProjectSchedule"));
const ProjectBidding = React.lazy(() => import("./pages/ProjectBidding"));
const ProjectPurchaseOrders = React.lazy(() => import("./pages/ProjectPurchaseOrders"));
const TakeoffEditor = React.lazy(() => import("./pages/TakeoffEditor"));
const EstimatingAI = React.lazy(() => import("./pages/EstimatingAI"));
const Companies = React.lazy(() => import("./pages/Companies"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Messages = React.lazy(() => import("./pages/Messages"));
const Issues = React.lazy(() => import("./pages/Issues"));
const Auth = React.lazy(() => import("./pages/Auth"));
const Landing = React.lazy(() => import("./pages/Landing"));
const PasswordReset = React.lazy(() => import("./pages/PasswordReset"));
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Accounting = React.lazy(() => import("./pages/Accounting"));
const MarketplaceSignup = React.lazy(() => import("./pages/MarketplaceSignup"));
const MarketplacePortal = React.lazy(() => import("./pages/MarketplacePortal"));
const AboutUs = React.lazy(() => import("./pages/AboutUs"));
const FeatureAccounting = React.lazy(() => import("./pages/features/Accounting"));
const FeatureAIBillManagement = React.lazy(() => import("./pages/features/AIBillManagement"));
const FeatureGanttScheduling = React.lazy(() => import("./pages/features/GanttScheduling"));
const FeatureBidManagement = React.lazy(() => import("./pages/features/BidManagement"));
const FeatureDocumentManagement = React.lazy(() => import("./pages/features/DocumentManagement"));
const FeatureTeamCommunication = React.lazy(() => import("./pages/features/TeamCommunication"));
const FeatureJoinMarketplace = React.lazy(() => import("./pages/features/JoinMarketplace"));
const ApproveBills = React.lazy(() => import("./pages/ApproveBills"));
const ReviewBills = React.lazy(() => import("./pages/ReviewBills"));
const BalanceSheet = React.lazy(() => import("./pages/BalanceSheet"));
const IncomeStatement = React.lazy(() => import("./pages/IncomeStatement"));
const WriteChecks = React.lazy(() => import("./pages/WriteChecks"));
const MakeDeposits = React.lazy(() => import("./pages/MakeDeposits"));
const BankReconciliation = React.lazy(() => import("./pages/BankReconciliation"));
const JournalEntry = React.lazy(() => import("./pages/JournalEntry"));
const Transactions = React.lazy(() => import("./pages/Transactions"));
const Reports = React.lazy(() => import("./pages/Reports"));
const BidResponseConfirmation = React.lazy(() => import("./pages/BidResponseConfirmation"));
const ScheduleResponseConfirmation = React.lazy(() => import("./pages/ScheduleResponseConfirmation"));
const POResponseConfirmation = React.lazy(() => import("./pages/POResponseConfirmation"));
const BidSubmissionConfirmation = React.lazy(() => import("./pages/BidSubmissionConfirmation"));
const BidDeclined = React.lazy(() => import("./pages/BidDeclined"));
const SubmitBid = React.lazy(() => import("./pages/SubmitBid"));
const CloseBooks = React.lazy(() => import("./pages/accounting/CloseBooks"));
const OutboundRedirect = React.lazy(() => import("./pages/OutboundRedirect"));
const Marketplace = React.lazy(() => import("./pages/Marketplace"));
const Apartments = React.lazy(() => import("./pages/Apartments"));
const Templates = React.lazy(() => import("./pages/Templates"));
const SubcontractorContract = React.lazy(() => import("./pages/templates/SubcontractorContract"));
const SubcontractorContractEdit = React.lazy(() => import("./pages/templates/SubcontractorContractEdit"));

// Guards are small, but lazy-load them too for safety
const MarketplaceGuard = React.lazy(() => import("./components/guards/MarketplaceGuard").then(m => ({ default: m.MarketplaceGuard })));
const TemplatesGuard = React.lazy(() => import("./components/guards/TemplatesGuard").then(m => ({ default: m.TemplatesGuard })));

const queryClient = new QueryClient();

// Helper to wrap any element in Suspense
const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<RouteFallback />}>{children}</Suspense>
);

const AppContent = () => {
  console.log("[APP] AppContent rendering");

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
        <ChatProvider>
          <ImpersonationBanner />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* ===== PUBLIC ROUTES (no SidebarProvider) ===== */}
              <Route path="/auth" element={<S><Auth /></S>} />
              <Route path="/auth/marketplace" element={<S><MarketplaceSignup /></S>} />
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="/about" element={<S><AboutUs /></S>} />
              <Route path="/features/accounting" element={<S><FeatureAccounting /></S>} />
              <Route path="/features/gantt-scheduling" element={<S><FeatureGanttScheduling /></S>} />
              <Route path="/features/ai-bill-management" element={<S><FeatureAIBillManagement /></S>} />
              <Route path="/features/bid-management" element={<S><FeatureBidManagement /></S>} />
              <Route path="/features/document-management" element={<S><FeatureDocumentManagement /></S>} />
              <Route path="/features/team-communication" element={<S><FeatureTeamCommunication /></S>} />
              <Route path="/features/join-marketplace" element={<S><FeatureJoinMarketplace /></S>} />
              <Route path="/reset-password" element={<S><PasswordReset /></S>} />
              <Route path="/out" element={<S><OutboundRedirect /></S>} />
              <Route path="/s/p/:shareId" element={<S><SharedPhoto /></S>} />
              <Route path="/s/f/:shareId" element={<S><SharedFolder /></S>} />
              <Route path="/bid-response-confirmation" element={<S><BidResponseConfirmation /></S>} />
              <Route path="/schedule-response-confirmation" element={<S><ScheduleResponseConfirmation /></S>} />
              <Route path="/po-response-confirmation" element={<S><POResponseConfirmation /></S>} />
              <Route path="/submit-bid" element={<S><SubmitBid /></S>} />
              <Route path="/bid-submission-confirmation" element={<S><BidSubmissionConfirmation /></S>} />
              <Route path="/bid-declined" element={<S><BidDeclined /></S>} />

              {/* ===== ROUTES WITH SIDEBAR ===== */}
              <Route element={<SidebarLayout />}>
                <Route path="/" element={<S><RootRoute /></S>} />
                <Route path="/marketplace-portal" element={<ProtectedRoute><S><MarketplacePortal /></S></ProtectedRoute>} />
                <Route path="/accounting" element={<ProtectedRoute><S><Accounting /></S></ProtectedRoute>} />
                <Route path="/accounting/bills/approve" element={<ProtectedRoute><S><ApproveBills /></S></ProtectedRoute>} />
                <Route path="/accounting/transactions/journal-entry" element={<ProtectedRoute><S><JournalEntry /></S></ProtectedRoute>} />
                <Route path="/accounting/reports/balance-sheet" element={<ProtectedRoute><S><BalanceSheet /></S></ProtectedRoute>} />
                <Route path="/accounting/reports/income-statement" element={<ProtectedRoute><S><IncomeStatement /></S></ProtectedRoute>} />
                <Route path="/accounting/banking/write-checks" element={<ProtectedRoute><S><WriteChecks /></S></ProtectedRoute>} />
                <Route path="/accounting/banking/make-deposits" element={<ProtectedRoute><S><MakeDeposits /></S></ProtectedRoute>} />
                <Route path="/estimating-ai" element={<ProtectedRoute><S><EstimatingAI /></S></ProtectedRoute>} />
                <Route path="/project/:projectId" element={<ProtectedRoute><S><ProjectDashboard /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/photos" element={<ProtectedRoute><S><ProjectPhotos /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/files" element={<ProtectedRoute><S><ProjectFiles /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/estimate" element={<ProtectedRoute><S><TakeoffEditor /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/budget" element={<ProtectedRoute><S><ProjectBudget /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/bidding" element={<ProtectedRoute><S><ProjectBidding /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/purchase-orders" element={<ProtectedRoute><S><ProjectPurchaseOrders /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/schedule" element={<ProtectedRoute><S><ProjectSchedule /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/estimating-ai" element={<ProtectedRoute><S><EstimatingAI /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting" element={<ProtectedRoute><S><Accounting /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/bills/review" element={<ProtectedRoute><S><ReviewBills /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/bills/approve" element={<ProtectedRoute><S><ApproveBills /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/transactions/journal-entry" element={<ProtectedRoute><S><JournalEntry /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/reports/balance-sheet" element={<ProtectedRoute><S><BalanceSheet /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/reports/income-statement" element={<ProtectedRoute><S><IncomeStatement /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/transactions" element={<ProtectedRoute><S><Transactions /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/reports" element={<ProtectedRoute><S><Reports /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/banking/write-checks" element={<ProtectedRoute><S><WriteChecks /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/banking/make-deposits" element={<ProtectedRoute><S><MakeDeposits /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/banking/reconciliation" element={<ProtectedRoute><S><BankReconciliation /></S></ProtectedRoute>} />
                <Route path="/project/:projectId/accounting/close-books" element={<ProtectedRoute><S><CloseBooks /></S></ProtectedRoute>} />
                <Route path="/issues" element={<ProtectedRoute><S><Issues /></S></ProtectedRoute>} />
                <Route path="/templates" element={<ProtectedRoute><S><TemplatesGuard><Templates /></TemplatesGuard></S></ProtectedRoute>} />
                <Route path="/templates/subcontractor-contract" element={<ProtectedRoute><S><TemplatesGuard><SubcontractorContract /></TemplatesGuard></S></ProtectedRoute>} />
                <Route path="/templates/subcontractor-contract/edit" element={<ProtectedRoute><S><TemplatesGuard><SubcontractorContractEdit /></TemplatesGuard></S></ProtectedRoute>} />
                <Route path="/marketplace" element={<ProtectedRoute><S><MarketplaceGuard><Marketplace /></MarketplaceGuard></S></ProtectedRoute>} />
                <Route path="/apartments" element={<ProtectedRoute><S><Apartments /></S></ProtectedRoute>} />
                <Route path="/companies" element={<ProtectedRoute><S><Companies /></S></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><S><Settings /></S></ProtectedRoute>} />
                {navItems.map(({ to, page: Page }) => (
                  <Route key={to} path={to} element={<ProtectedRoute><S><Page /></S></ProtectedRoute>} />
                ))}
              </Route>

              {/* Catch all */}
              <Route path="*" element={<S><NotFound /></S>} />
            </Routes>
          </Suspense>
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
