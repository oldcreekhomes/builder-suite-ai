import { Suspense, lazy, ComponentType } from "react";
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

// Lightweight loading fallback
const PageLoader = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}
  >
    <div
      style={{
        width: "32px",
        height: "32px",
        border: "2px solid #e5e7eb",
        borderTopColor: "#2563eb",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
    <p style={{ marginTop: "16px", color: "#6b7280", fontSize: "14px" }}>
      Loading BuilderSuite ML...
    </p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Helper: wraps React.lazy with an error boundary so one bad page can't blank the app
function safeLazy(factory: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    factory().catch((err) => {
      console.error("[LazyLoad] Failed to load module:", err);
      return {
        default: () => (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>
            <h2 style={{ color: "#dc2626", marginBottom: 8 }}>Failed to load page</h2>
            <p style={{ color: "#6b7280", marginBottom: 16 }}>
              This page could not be loaded. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        ),
      };
    })
  );
}

// ===== Lazy-loaded pages =====
const Auth = safeLazy(() => import("./pages/Auth"));
const Landing = safeLazy(() => import("./pages/Landing"));
const AboutUs = safeLazy(() => import("./pages/AboutUs"));
const PasswordReset = safeLazy(() => import("./pages/PasswordReset"));
const NotFound = safeLazy(() => import("./pages/NotFound"));
const OutboundRedirect = safeLazy(() => import("./pages/OutboundRedirect"));
const MarketplaceSignup = safeLazy(() => import("./pages/MarketplaceSignup"));

// Public share / bid pages
const SharedPhoto = safeLazy(() => import("./pages/SharedPhoto"));
const SharedFolder = safeLazy(() => import("./pages/SharedFolder"));
const BidResponseConfirmation = safeLazy(() => import("./pages/BidResponseConfirmation"));
const ScheduleResponseConfirmation = safeLazy(() => import("./pages/ScheduleResponseConfirmation"));
const POResponseConfirmation = safeLazy(() => import("./pages/POResponseConfirmation"));
const BidSubmissionConfirmation = safeLazy(() => import("./pages/BidSubmissionConfirmation"));
const BidDeclined = safeLazy(() => import("./pages/BidDeclined"));
const SubmitBid = safeLazy(() => import("./pages/SubmitBid"));

// Feature pages
const FeatureAccounting = safeLazy(() => import("./pages/features/Accounting"));
const FeatureAIBillManagement = safeLazy(() => import("./pages/features/AIBillManagement"));
const FeatureGanttScheduling = safeLazy(() => import("./pages/features/GanttScheduling"));
const FeatureBidManagement = safeLazy(() => import("./pages/features/BidManagement"));
const FeatureDocumentManagement = safeLazy(() => import("./pages/features/DocumentManagement"));
const FeatureTeamCommunication = safeLazy(() => import("./pages/features/TeamCommunication"));
const FeatureJoinMarketplace = safeLazy(() => import("./pages/features/JoinMarketplace"));

// Sidebar / protected pages
const RootRoute = safeLazy(() => import("./components/RootRoute"));
const ProjectDashboard = safeLazy(() => import("./pages/ProjectDashboard"));
const ProjectPhotos = safeLazy(() => import("./pages/ProjectPhotos"));
const ProjectFiles = safeLazy(() => import("./pages/ProjectFiles"));
const ProjectBudget = safeLazy(() => import("./pages/ProjectBudget"));
const ProjectSchedule = safeLazy(() => import("./pages/ProjectSchedule"));
const ProjectBidding = safeLazy(() => import("./pages/ProjectBidding"));
const ProjectPurchaseOrders = safeLazy(() => import("./pages/ProjectPurchaseOrders"));
const TakeoffEditor = safeLazy(() => import("./pages/TakeoffEditor"));
const EstimatingAI = safeLazy(() => import("./pages/EstimatingAI"));
const Companies = safeLazy(() => import("./pages/Companies"));
const Settings = safeLazy(() => import("./pages/Settings"));
const Messages = safeLazy(() => import("./pages/Messages"));
const Issues = safeLazy(() => import("./pages/Issues"));
const Index = safeLazy(() => import("./pages/Index"));
const MarketplacePortal = safeLazy(() => import("./pages/MarketplacePortal"));

// Accounting pages
const Accounting = safeLazy(() => import("./pages/Accounting"));
const ApproveBills = safeLazy(() => import("./pages/ApproveBills"));
const ReviewBills = safeLazy(() => import("./pages/ReviewBills"));
const BalanceSheet = safeLazy(() => import("./pages/BalanceSheet"));
const IncomeStatement = safeLazy(() => import("./pages/IncomeStatement"));
const WriteChecks = safeLazy(() => import("./pages/WriteChecks"));
const MakeDeposits = safeLazy(() => import("./pages/MakeDeposits"));
const BankReconciliation = safeLazy(() => import("./pages/BankReconciliation"));
const JournalEntry = safeLazy(() => import("./pages/JournalEntry"));
const Transactions = safeLazy(() => import("./pages/Transactions"));
const Reports = safeLazy(() => import("./pages/Reports"));
const CloseBooks = safeLazy(() => import("./pages/accounting/CloseBooks"));

// Marketplace & Templates
const Marketplace = safeLazy(() => import("./pages/Marketplace"));
const Templates = safeLazy(() => import("./pages/Templates"));
const SubcontractorContract = safeLazy(() => import("./pages/templates/SubcontractorContract"));
const SubcontractorContractEdit = safeLazy(() => import("./pages/templates/SubcontractorContractEdit"));

// Apartments
const ApartmentDashboard = safeLazy(() => import("./pages/apartments/ApartmentDashboard"));
const ApartmentInputs = safeLazy(() => import("./pages/apartments/ApartmentInputs"));
const ApartmentIncomeStatement = safeLazy(() => import("./pages/apartments/ApartmentIncomeStatement"));
const ApartmentAmortizationSchedule = safeLazy(() => import("./pages/apartments/ApartmentAmortizationSchedule"));

// Guards (small, keep static)
import { MarketplaceGuard } from "./components/guards/MarketplaceGuard";
import { TemplatesGuard } from "./components/guards/TemplatesGuard";
import { ApartmentGuard } from "./components/guards/ApartmentGuard";

const queryClient = new QueryClient();

const AppContent = () => {
  console.log("[APP] AppContent rendering");

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
        <ChatProvider>
          <ImpersonationBanner />
          <Suspense fallback={<PageLoader />}>
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
                <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                {navItems.map(({ to, page: Page }) => (
                  <Route key={to} path={to} element={<ProtectedRoute><Page /></ProtectedRoute>} />
                ))}
              </Route>

              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
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
