import { Calculator, Home, FileText } from "lucide-react";

const items = [
  { title: "Company Dashboard", url: "/", icon: Home },
];

const billsSubItems = [
  { title: "Approval Status", url: "/accounting/bills/approval-status" },
  { title: "Enter Bills", url: "/accounting/bills/enter" },
];

export function AccountingSidebar() {
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
        </div>
      </div>
    </div>
  );
}