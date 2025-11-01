import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatProvider } from "@/contexts/ChatContext";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { navItems } from "./nav-items";
import ProtectedRoute from "./components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";
import Accounting from "./pages/Accounting";

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

import { supabase } from "@/integrations/supabase/client";
import { registerLicense } from '@syncfusion/ej2-base';
import { useBrowserTitle } from "@/hooks/useBrowserTitle";

const queryClient = new QueryClient();

const AppContent = () => {
  const [syncfusionLicenseRegistered, setSyncfusionLicenseRegistered] = useState(false);
  
  // Initialize browser title with unread counts (must be after QueryClientProvider)
  console.log('🔄 Browser title hook initialized inside QueryClientProvider');
  useBrowserTitle();

  // Register Syncfusion license at application startup
  useEffect(() => {
    const registerSyncfusionLicense = async () => {
      try {
        console.log('Registering Syncfusion license...');
        
        // Simple timeout without AbortController
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('License fetch timeout')), 1000);
        });
        
        const fetchPromise = supabase.functions.invoke('get-syncfusion-key');
        
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('Error fetching Syncfusion license:', error);
        } else if (data?.key) {
          registerLicense(data.key);
          console.log('Syncfusion license registered successfully');
        } else {
          console.warn('No Syncfusion license key found');
        }
      } catch (error) {
        console.error('Failed to register Syncfusion license:', error);
      } finally {
        setSyncfusionLicenseRegistered(true);
      }
    };

    registerSyncfusionLicense();
  }, []);

  // Note: Global chat notifications are now handled by FloatingChatManager using the master hook
  // to prevent duplicate Supabase subscriptions

  return (
    <BrowserRouter>
      <ChatProvider>
        <SidebarProvider>
          <ImpersonationBanner />
          <Routes>
          {/* Auth route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Landing page route */}
          <Route path="/landing" element={<Landing />} />
          
          {/* Root route - show Index for authenticated users, redirect to auth for unauthenticated */}
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          
          {/* Accounting routes */}
          <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
          <Route path="/accounting/bills/approve" element={<ProtectedRoute><ApproveBills /></ProtectedRoute>} />
          <Route path="/accounting/transactions/journal-entry" element={<ProtectedRoute><JournalEntry /></ProtectedRoute>} />
          <Route path="/accounting/reports/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
          <Route path="/accounting/reports/income-statement" element={<ProtectedRoute><IncomeStatement /></ProtectedRoute>} />
          <Route path="/accounting/banking/write-checks" element={<ProtectedRoute><WriteChecks /></ProtectedRoute>} />
          <Route path="/accounting/banking/make-deposits" element={<ProtectedRoute><MakeDeposits /></ProtectedRoute>} />
          
          {/* Estimating AI route */}
          <Route path="/estimating-ai" element={<ProtectedRoute><EstimatingAI /></ProtectedRoute>} />
          
          
          {/* Password Reset route - MUST be accessible without authentication */}
          <Route path="/reset-password" element={<PasswordReset />} />
          
          {/* Shared routes - no authentication required */}
          <Route path="/s/p/:shareId" element={<SharedPhoto />} />
          <Route path="/s/f/:shareId" element={<SharedFolder />} />
          
          {/* Project Dashboard route */}
          <Route path="/project/:projectId" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
          
          {/* Project Photos route */}
          <Route path="/project/:projectId/photos" element={<ProtectedRoute><ProjectPhotos /></ProtectedRoute>} />
          
          {/* Project Files route */}
          <Route path="/project/:projectId/files" element={<ProtectedRoute><ProjectFiles /></ProtectedRoute>} />
          
          {/* Project Estimate route */}
          <Route path="/project/:projectId/estimate" element={<ProtectedRoute><TakeoffEditor /></ProtectedRoute>} />
          
          {/* Project Budget route */}
          <Route path="/project/:projectId/budget" element={<ProtectedRoute><ProjectBudget /></ProtectedRoute>} />
          
          {/* Project Bidding route */}
          <Route path="/project/:projectId/bidding" element={<ProtectedRoute><ProjectBidding /></ProtectedRoute>} />
          
          {/* Project Purchase Orders route */}
          <Route path="/project/:projectId/purchase-orders" element={<ProtectedRoute><ProjectPurchaseOrders /></ProtectedRoute>} />
          
          {/* Project Schedule route */}
          <Route path="/project/:projectId/schedule" element={<ProtectedRoute><ProjectSchedule /></ProtectedRoute>} />
          
          {/* Project Estimating AI route */}
          <Route path="/project/:projectId/estimating-ai" element={<ProtectedRoute><EstimatingAI /></ProtectedRoute>} />
          
          {/* Project Accounting routes */}
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
          
          
          {/* Messages route - TEMPORARILY DISABLED
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/project/:projectId/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          */}
          
          {/* Issues route - company-wide */}
          <Route path="/issues" element={<ProtectedRoute><Issues /></ProtectedRoute>} />
          
          {/* Companies route */}
          <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
          
          {/* Settings route */}
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Bid Response Confirmation - no auth required */}
          <Route path="/bid-response-confirmation" element={<BidResponseConfirmation />} />
          
          {/* Schedule Response Confirmation - no auth required */}
          <Route path="/schedule-response-confirmation" element={<ScheduleResponseConfirmation />} />
          
          {/* PO Response Confirmation - no auth required */}
          <Route path="/po-response-confirmation" element={<POResponseConfirmation />} />
          
          {/* Submit Bid - no auth required */}
          <Route path="/submit-bid" element={<SubmitBid />} />
          
          {/* Bid Submission Confirmation - no auth required */}
          <Route path="/bid-submission-confirmation" element={<BidSubmissionConfirmation />} />
          
          {/* Bid Declined - no auth required */}
          <Route path="/bid-declined" element={<BidDeclined />} />
          
          {/* Protected routes */}
          {navItems.map(({ to, page }) => (
            <Route key={to} path={to} element={<ProtectedRoute>{page}</ProtectedRoute>} />
          ))}
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </SidebarProvider>
      </ChatProvider>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
