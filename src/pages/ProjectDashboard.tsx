
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, DollarSign, CloudSun, Camera } from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  manager: string;
  address: string;
  createdAt: string;
}

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const projects = JSON.parse(localStorage.getItem("projects") || "[]");
    const foundProject = projects.find((p: Project) => p.id === projectId);
    
    if (foundProject) {
      setProject(foundProject);
    } else {
      navigate("/");
    }
  }, [projectId, navigate]);

  if (!project) {
    return <div>Loading...</div>;
  }

  // Mock data for project details
  const projectDetails = {
    startDate: "2024-01-15",
    endDate: "2024-08-30",
    projectedRevenue: "$2,450,000",
    weather: [
      { day: "Today", temp: "72°F", condition: "Sunny" },
      { day: "Tomorrow", temp: "75°F", condition: "Partly Cloudy" },
      { day: "Wed", temp: "68°F", condition: "Rainy" },
      { day: "Thu", temp: "71°F", condition: "Sunny" },
      { day: "Fri", temp: "74°F", condition: "Sunny" },
    ],
    recentPhotos: [
      { id: 1, date: "2024-01-20", description: "Foundation completed" },
      { id: 2, date: "2024-01-18", description: "Site preparation" },
      { id: 3, date: "2024-01-15", description: "Project kickoff" },
    ]
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="text-gray-600 hover:text-black" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-gray-600 hover:text-black"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-black">{project.name}</h1>
                <p className="text-gray-600">{project.address}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            {/* Project Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Start Date</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectDetails.startDate}</div>
                  <p className="text-xs text-muted-foreground">Project commenced</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">End Date</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectDetails.endDate}</div>
                  <p className="text-xs text-muted-foreground">Expected completion</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectDetails.projectedRevenue}</div>
                  <p className="text-xs text-muted-foreground">Total project value</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weather Forecast */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CloudSun className="h-5 w-5 mr-2" />
                    10-Day Weather Forecast
                  </CardTitle>
                  <CardDescription>Weather conditions for the next 10 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {projectDetails.weather.map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium">{day.day}</div>
                        <div className="text-sm text-gray-600">{day.condition}</div>
                        <div className="font-bold">{day.temp}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    Recent Pictures
                  </CardTitle>
                  <CardDescription>Latest project photos in chronological order</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {projectDetails.recentPhotos.map((photo) => (
                      <div key={photo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{photo.description}</div>
                          <div className="text-sm text-gray-600">{photo.date}</div>
                        </div>
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Camera className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
