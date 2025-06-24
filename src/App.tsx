
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Shared routes - no authentication required */}
          <Route path="/s/p/:shareId" element={<SharedPhoto />} />
          <Route path="/s/f/:shareId" element={<SharedFolder />} />
          
          {/* Project Dashboard route */}
          <Route path="/project/:projectId" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
          
          {/* Project Photos route */}
          <Route path="/project/:projectId/photos" element={<ProtectedRoute><ProjectPhotos /></ProtectedRoute>} />
          
          {/* Protected routes */}
          {navItems.map(({ to, page }) => (
            <Route key={to} path={to} element={<ProtectedRoute>{page}</ProtectedRoute>} />
          ))}
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
