import { Home, Calculator, AlertTriangle } from "lucide-react";

const items = [
  { title: "Company Dashboard", url: "/", icon: Home },
  { title: "Accounting", url: "/accounting", icon: Calculator },
];

export function CompanyDashboardNav() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-1">
        <div>
          {items.map((item) => (
            <div key={item.title}>
              <a 
                href={item.url} 
                className="flex items-center space-x-2 px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
              </a>
            </div>
          ))}
        </div>

        {/* Software Issues Section with separator */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div>
            <a href="/issues" className="flex items-center px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Software Issues</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}