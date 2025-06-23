
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Settings = () => {
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

              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle>Company Configuration</CardTitle>
                  <CardDescription>
                    Configure cost codes and specifications for your projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Cost Code
                          </Button>
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
                              <TableRow>
                                <TableCell className="font-medium">001</TableCell>
                                <TableCell>Site Preparation</TableCell>
                                <TableCell>Foundation</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">Edit</Button>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">002</TableCell>
                                <TableCell>Excavation</TableCell>
                                <TableCell>Foundation</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">Edit</Button>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">003</TableCell>
                                <TableCell>Concrete Foundation</TableCell>
                                <TableCell>Foundation</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">Edit</Button>
                                </TableCell>
                              </TableRow>
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
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
