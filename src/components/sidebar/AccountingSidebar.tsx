import { Calculator, Home, FileText, AlertTriangle, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useIssueCounts } from "@/hooks/useIssueCounts";

const items = [
  { title: "Company Dashboard", url: "/", icon: Home },
];

const billsSubItems = [
  { title: "Approval Status", url: "/accounting/bills/approval-status" },
  { title: "Manually Enter Bills", url: "/accounting/bills/enter" },
  { title: "Approve Bills", url: "/accounting/bills/approve" },
  { title: "Pay Bills", url: "/accounting/bills/pay" },
];

const reportsSubItems = [
  // Reports sub-items will be added here
];

export function AccountingSidebar() {
  const { data: issueCounts } = useIssueCounts();
  
  // Calculate total issue counts
  const totalNormalIssues = Object.values(issueCounts || {}).reduce(
    (total, category) => total + category.normal,
    0
  );
  const totalHighIssues = Object.values(issueCounts || {}).reduce(
    (total, category) => total + category.high,
    0
  );

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
          
          {/* Bills Section */}
          <div className="mt-2">
            <div className="flex items-center space-x-2 px-2 py-2 text-gray-700 text-sm">
              <FileText className="h-4 w-4" />
              <span className="flex-1">Bills</span>
            </div>
            <div className="ml-6">
              {billsSubItems.map((subItem) => (
                <div key={subItem.title}>
                  <a 
                    href={subItem.url} 
                    className="flex items-center px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
                  >
                    <span className="flex-1">{subItem.title}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
          
          {/* Reports Section */}
          <div className="mt-2">
            <div className="flex items-center space-x-2 px-2 py-2 text-gray-700 text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="flex-1">Reports</span>
            </div>
            <div className="ml-6">
              {reportsSubItems.map((subItem) => (
                <div key={subItem.title}>
                  <a 
                    href={subItem.url} 
                    className="flex items-center px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
                  >
                    <span className="flex-1">{subItem.title}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Software Issues Section with separator */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div>
            <Link to="/issues" className="flex items-center px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Software Issues</span>
              <div className="flex items-center gap-1 ml-auto">
                {totalNormalIssues > 0 && (
                  <span className="bg-gray-800 text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
                    {totalNormalIssues > 99 ? '99+' : totalNormalIssues}
                  </span>
                )}
                {totalHighIssues > 0 && (
                  <span className="bg-destructive text-destructive-foreground rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
                    {totalHighIssues > 99 ? '99+' : totalHighIssues}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}