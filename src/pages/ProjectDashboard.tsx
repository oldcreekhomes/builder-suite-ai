
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, User, MapPin, Camera, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Project {
  id: string;
  name: string;
  address: string;
  status: string;
  manager: string;
  created_at: string;
  updated_at: string;
}

interface ProjectPhoto {
  id: string;
  url: string;
  description: string | null;
  uploaded_at: string;
  uploaded_by: string;
}

interface ScheduleItem {
  id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  status: string;
  assigned_to: string | null;
}

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !user) return;

    const fetchProjectData = async () => {
      setLoading(true);
      
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) {
          console.error("Error fetching project:", projectError);
          toast({
            title: "Error",
            description: "Failed to load project details",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setProject(projectData);

        // Fetch last 20 photos
        const { data: photosData, error: photosError } = await supabase
          .from('project_photos')
          .select('*')
          .eq('project_id', projectId)
          .order('uploaded_at', { ascending: false })
          .limit(20);

        if (photosError) {
          console.error("Error fetching photos:", photosError);
        } else {
          setPhotos(photosData || []);
        }

        // Fetch schedule
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('project_schedule')
          .select('*')
          .eq('project_id', projectId)
          .order('start_date', { ascending: true });

        if (scheduleError) {
          console.error("Error fetching schedule:", scheduleError);
        } else {
          setSchedule(scheduleData || []);
        }

      } catch (error) {
        console.error("Unexpected error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, user, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p>Project not found</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
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
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {project.address}
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {project.manager}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            {/* Project Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Project Status</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{project.status}</div>
                  <p className="text-xs text-muted-foreground">Current status</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Created</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Project start date</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Photos</CardTitle>
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{photos.length}</div>
                  <p className="text-xs text-muted-foreground">Total photos uploaded</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    Recent Photos (Last 20)
                  </CardTitle>
                  <CardDescription>Latest project photos in chronological order</CardDescription>
                </CardHeader>
                <CardContent>
                  {photos.length === 0 ? (
                    <div className="text-center py-8">
                      <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No photos uploaded yet</p>
                      <p className="text-sm text-gray-400">Upload photos to track project progress</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {photos.map((photo) => (
                        <div key={photo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">
                              {photo.description || "Untitled Photo"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(photo.uploaded_at).toLocaleDateString()} at{" "}
                              {new Date(photo.uploaded_at).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Camera className="h-6 w-6 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Project Schedule
                  </CardTitle>
                  <CardDescription>Upcoming tasks and milestones</CardDescription>
                </CardHeader>
                <CardContent>
                  {schedule.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No schedule items yet</p>
                      <p className="text-sm text-gray-400">Add tasks to track project timeline</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Start</TableHead>
                            <TableHead>End</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schedule.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.task_name}</div>
                                  {item.assigned_to && (
                                    <div className="text-sm text-gray-500">
                                      Assigned to: {item.assigned_to}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(item.start_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(item.end_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(item.status)}
                                  <span className="text-sm capitalize">{item.status}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
