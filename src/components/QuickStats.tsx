
import { Card } from "@/components/ui/card";
import { Building2, Clock, DollarSign, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Active Projects",
    value: "12",
    change: "+2 this month",
    icon: Building2,
    trend: "up"
  },
  {
    title: "Total Revenue",
    value: "$2.4M",
    change: "+15% from last month",
    icon: DollarSign,
    trend: "up"
  },
  {
    title: "On Schedule",
    value: "9/12",
    change: "75% completion rate",
    icon: Clock,
    trend: "neutral"
  },
  {
    title: "Avg. Margin",
    value: "18.5%",
    change: "+2.1% vs target",
    icon: TrendingUp,
    trend: "up"
  }
];

export function QuickStats() {
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
