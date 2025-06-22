
import { Card } from "@/components/ui/card";
import { Building2, Clock, DollarSign, TrendingUp } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useMemo } from "react";

export function QuickStats() {
  const { data: projects = [], isLoading } = useProjects();

  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'Completed').length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const inProgressProjects = projects.filter(p => p.status === 'In Progress' || p.status === 'Under Construction').length;
    const onScheduleRate = inProgressProjects > 0 ? Math.round((inProgressProjects / activeProjects) * 100) : 0;

    return [
      {
        title: "Active Projects",
        value: activeProjects.toString(),
        change: projects.length > 0 ? `${projects.length} total projects` : "No projects yet",
        icon: Building2,
        trend: "neutral"
      },
      {
        title: "Total Projects",
        value: projects.length.toString(),
        change: completedProjects > 0 ? `${completedProjects} completed` : "Get started!",
        icon: DollarSign,
        trend: completedProjects > 0 ? "up" : "neutral"
      },
      {
        title: "In Progress",
        value: `${inProgressProjects}/${activeProjects}`,
        change: activeProjects > 0 ? `${onScheduleRate}% of active` : "Ready to start",
        icon: Clock,
        trend: inProgressProjects > 0 ? "up" : "neutral"
      },
      {
        title: "Completion Rate",
        value: projects.length > 0 ? `${Math.round((completedProjects / projects.length) * 100)}%` : "0%",
        change: projects.length > 0 ? "Overall progress" : "Create your first project",
        icon: TrendingUp,
        trend: completedProjects > 0 ? "up" : "neutral"
      }
    ];
  }, [projects]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6 bg-white border border-gray-200 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
              <div className="bg-gray-200 p-3 rounded-lg">
                <div className="h-6 w-6 bg-gray-300 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6 bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
              <p className="text-2xl font-bold text-black mt-1">{stat.value}</p>
              <p className={`text-sm mt-1 ${
                stat.trend === 'up' ? 'text-green-600' : 
                stat.trend === 'down' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {stat.change}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <stat.icon className="h-6 w-6 text-gray-700" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
