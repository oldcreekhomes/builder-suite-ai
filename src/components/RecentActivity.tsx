
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, DollarSign, Clock } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "estimate",
    title: "AI Estimate Completed",
    description: "Downtown Luxury Condos - Foundation",
    time: "2 hours ago",
    icon: FileText,
    status: "completed"
  },
  {
    id: 2,
    type: "schedule",
    title: "Schedule Updated",
    description: "Sunset Villa - Framing phase moved up",
    time: "4 hours ago",
    icon: Calendar,
    status: "updated"
  },
  {
    id: 3,
    type: "budget",
    title: "Budget Alert",
    description: "Green Meadows approaching 80% budget",
    time: "6 hours ago",
    icon: DollarSign,
    status: "alert"
  },
  {
    id: 4,
    type: "deadline",
    title: "Milestone Achieved",
    description: "Riverside Townhomes - Foundation complete",
    time: "1 day ago",
    icon: Clock,
    status: "completed"
  },
  {
    id: 5,
    type: "bid",
    title: "New Bid Submitted",
    description: "Oak Street Apartments - $2.3M",
    time: "2 days ago",
    icon: FileText,
    status: "pending"
  }
];

const getActivityColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "updated": return "bg-blue-100 text-blue-800";
    case "alert": return "bg-yellow-100 text-yellow-800";
    case "pending": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export function RecentActivity() {
  return (
    <Card className="bg-white border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-black">Recent Activity</h2>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="bg-gray-100 p-2 rounded-lg">
                <activity.icon className="h-4 w-4 text-gray-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-black text-sm">{activity.title}</p>
                  <Badge className={`${getActivityColor(activity.status)} text-xs`}>
                    {activity.status}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm">{activity.description}</p>
                <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
