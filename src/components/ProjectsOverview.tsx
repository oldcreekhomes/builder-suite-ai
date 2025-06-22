
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, MapPin, Calendar } from "lucide-react";

const projects = [
  {
    id: 1,
    name: "Sunset Villa Development",
    location: "Austin, TX",
    status: "In Progress",
    progress: 75,
    budget: "$1.2M",
    deadline: "Dec 15, 2024",
    manager: "Sarah Johnson"
  },
  {
    id: 2,
    name: "Downtown Luxury Condos",
    location: "Dallas, TX",
    status: "Planning",
    progress: 25,
    budget: "$3.8M",
    deadline: "Mar 20, 2025",
    manager: "Mike Chen"
  },
  {
    id: 3,
    name: "Green Meadows Subdivision",
    location: "Houston, TX",
    status: "In Progress",
    progress: 60,
    budget: "$2.1M",
    deadline: "Jan 30, 2025",
    manager: "David Rodriguez"
  },
  {
    id: 4,
    name: "Riverside Townhomes",
    location: "San Antonio, TX",
    status: "Completed",
    progress: 100,
    budget: "$950K",
    deadline: "Completed",
    manager: "Lisa Wang"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "In Progress": return "bg-blue-100 text-blue-800";
    case "Planning": return "bg-yellow-100 text-yellow-800";
    case "Completed": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export function ProjectsOverview() {
  return (
    <Card className="bg-white border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Active Projects</h2>
          <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
            View All
          </Button>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-black text-lg">{project.name}</h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {project.location}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {project.deadline}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-black">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>
            
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <div className="text-sm">
                <span className="text-gray-600">Budget: </span>
                <span className="font-semibold text-black">{project.budget}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Manager: </span>
                <span className="font-medium text-black">{project.manager}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
