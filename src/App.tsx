
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { navItems } from "./nav-items";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import ProjectDashboard from "./pages/ProjectDashboard";
import ProjectPhotos from "./pages/ProjectPhotos";
import ProjectFiles from "./pages/ProjectFiles";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/project/:projectId" 
              element={
                <ProtectedRoute>
                  <ProjectDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/project/:projectId/photos" 
              element={
                <ProtectedRoute>
                  <ProjectPhotos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/project/:projectId/files" 
              element={
                <ProtectedRoute>
                  <ProjectFiles />
                </ProtectedRoute>
              } 
            />
            {navItems.map(({ to, page }) => (
              <Route 
                key={to} 
                path={to} 
                element={
                  <ProtectedRoute>
                    {page}
                  </ProtectedRoute>
                } 
              />
            ))}
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
