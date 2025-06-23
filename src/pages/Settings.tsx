import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddCostCodeDialog } from "@/components/AddCostCodeDialog";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { useState } from "react";

const Settings = () => {
  const [costCodes, setCostCodes] = useState([
    { code: "001", name: "Site Preparation", category: "Foundation" },
    { code: "002", name: "Excavation", category: "Foundation" },
    { code: "003", name: "Concrete Foundation", category: "Foundation" },
  ]);

  const handleAddCostCode = (newCostCode: any) => {
    console.log("Adding new cost code:", newCostCode);
    setCostCodes(prev => [...prev, {
      code: newCostCode.code,
      name: newCostCode.name,
      category: newCostCode.parentGroup || "Uncategorized"
    }]);
  };

  const handleImportCostCodes = (importedCostCodes: any[]) => {
    console.log("Importing cost codes:", importedCostCodes);
    const newCostCodes = importedCostCodes.map(code => ({
      code: code.code,
      name: code.name,
      category: code.parentGroup || "Uncategorized"
    }));
    setCostCodes(prev => [...prev, ...newCostCodes]);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-black">Settings</h1>
                <p className="text-gray-600">Manage your company settings and configurations</p>
              </div>

              <Tabs defaultValue="cost-codes" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cost-codes">Cost Codes</TabsTrigger>
                  <TabsTrigger value="specifications">Specifications</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cost-codes" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-black">Cost Codes</h3>
                        <p className="text-sm text-gray-600">Manage your project cost codes and categories</p>
                      </div>
                      <div className="flex gap-2">
                        <ExcelImportDialog onImportCostCodes={handleImportCostCodes} />
                        <AddCostCodeDialog 
                          existingCostCodes={costCodes.map(cc => ({ code: cc.code, name: cc.name }))}
                          onAddCostCode={handleAddCostCode}
                        />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {costCodes.map((costCode) => (
                            <TableRow key={costCode.code}>
                              <TableCell className="font-medium">{costCode.code}</TableCell>
                              <TableCell>{costCode.name}</TableCell>
                              <TableCell>{costCode.category}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">Edit</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="specifications" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-black">Specifications</h3>
                        <p className="text-sm text-gray-600">Manage your project specifications and requirements</p>
                      </div>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Specification
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Specification</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Concrete Mix Design</TableCell>
                            <TableCell>Foundation</TableCell>
                            <TableCell>3000 PSI concrete with air entrainment</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Framing Lumber</TableCell>
                            <TableCell>Framing</TableCell>
                            <TableCell>Grade A Douglas Fir 2x4, 2x6, 2x8</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Insulation</TableCell>
                            <TableCell>Insulation</TableCell>
                            <TableCell>R-15 fiberglass batt insulation</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
