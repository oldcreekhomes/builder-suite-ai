import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Calendar, Building, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScheduleResponseConfirmation() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  const response = searchParams.get("response");
  const taskName = searchParams.get("task_name");
  const projectName = searchParams.get("project_name");
  const companyName = searchParams.get("company_name");

  useEffect(() => {
    console.log("ScheduleResponseConfirmation loaded - NEW VERSION");
    console.log("Response:", response);
    console.log("Task:", taskName);
    console.log("Project:", projectName);
    console.log("Company:", companyName);
    
    // Simulate a brief loading state for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [response, taskName, projectName, companyName]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isConfirmed = response === "confirm";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
              {isConfirmed ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Schedule {isConfirmed ? "Confirmed" : "Declined"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                {isConfirmed
                  ? "Thank you for confirming your schedule. We have recorded your response."
                  : "We have recorded that you declined this schedule. The project manager will be notified."}
              </p>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Task</p>
                  <p className="text-sm text-gray-600">{taskName || "Unknown Task"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Project</p>
                  <p className="text-sm text-gray-600">{projectName || "Unknown Project"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Company</p>
                  <p className="text-sm text-gray-600">{companyName || "Unknown Company"}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 text-center">
              <p className="text-xs text-gray-500">
                This response has been recorded on {new Date().toLocaleDateString()}
              </p>
              <div className="mt-4">
                <Button onClick={() => window.close()} className="px-8">
                  Close Window
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}