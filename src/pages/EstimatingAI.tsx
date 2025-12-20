import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Brain, Sparkles, Calculator, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEstimatePermissions } from "@/hooks/useEstimatePermissions";
import { toast } from "sonner";

export default function EstimatingAI() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { canAccessEstimate, isLoading } = useEstimatePermissions();

  // Redirect if user loses permission
  useEffect(() => {
    if (!isLoading && !canAccessEstimate) {
      toast.info("You no longer have access to this page");
      if (projectId) {
        navigate(`/project/${projectId}`);
      } else {
        navigate('/');
      }
    }
  }, [canAccessEstimate, isLoading, projectId, navigate]);

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // If no access, return null (redirect will happen)
  if (!canAccessEstimate) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Brain className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold">Estimating AI</h1>
                    <Badge variant="secondary" className="ml-2">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Powered
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Intelligent cost estimation and project analysis powered by artificial intelligence
                  </p>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                
                {/* Cost Estimation */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Smart Cost Estimation
                    </CardTitle>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">AI Analysis</div>
                    <p className="text-xs text-muted-foreground">
                      Generate accurate cost estimates using machine learning algorithms
                    </p>
                    <Button className="w-full mt-4" variant="outline">
                      Start Estimation
                    </Button>
                  </CardContent>
                </Card>

                {/* Material Optimization */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Material Optimization
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Optimize</div>
                    <p className="text-xs text-muted-foreground">
                      AI-powered recommendations for material selection and quantities
                    </p>
                    <Button className="w-full mt-4" variant="outline">
                      Analyze Materials
                    </Button>
                  </CardContent>
                </Card>

                {/* Report Generation */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Intelligent Reports
                    </CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Generate</div>
                    <p className="text-xs text-muted-foreground">
                      Create detailed estimation reports with AI insights
                    </p>
                    <Button className="w-full mt-4" variant="outline">
                      Create Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}