
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Companies from "./pages/Companies";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import ConfirmInvitation from "./pages/ConfirmInvitation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing page route */}
          <Route path="/landing" element={<Landing />} />
          
          {/* Auth route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Invitation confirmation route - no authentication required */}
          <Route path="/confirm-invitation" element={<ConfirmInvitation />} />
          
          {/* Shared routes - no authentication required */}
          <Route path="/s/p/:shareId" element={<SharedPhoto />} />
          <Route path="/s/f/:shareId" element={<SharedFolder />} />
          
          {/* Project Dashboard route */}
          <Route path="/project/:projectId" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
          
          {/* Project Photos route */}
          <Route path="/project/:projectId/photos" element={<ProtectedRoute><ProjectPhotos /></ProtectedRoute>} />
          
          {/* Project Files route */}
          <Route path="/project/:projectId/files" element={<ProtectedRoute><ProjectFiles /></ProtectedRoute>} />
          
          {/* Project Budget route */}
          <Route path="/project/:projectId/budget" element={<ProtectedRoute><ProjectBudget /></ProtectedRoute>} />
          
          {/* Project Bidding route */}
          <Route path="/project/:projectId/bidding" element={<ProtectedRoute><ProjectBidding /></ProtectedRoute>} />
          
          {/* Project Schedule route */}
          <Route path="/project/:projectId/schedules" element={<ProtectedRoute><ProjectSchedule /></ProtectedRoute>} />
          
          {/* Messages route - both global and project-specific */}
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/project/:projectId/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          
          {/* Companies route */}
          <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
          
          {/* Settings route */}
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Protected routes */}
          {navItems.map(({ to, page }) => (
            <Route key={to} path={to} element={<ProtectedRoute>{page}</ProtectedRoute>} />
          ))}
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
