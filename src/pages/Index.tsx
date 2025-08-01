import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Home } from "lucide-react";

export default function Index() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <Home className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
          </header>
          
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Welcome to BuilderSuite AI</h2>
                <p className="text-muted-foreground mt-2">
                  Select a project from the sidebar to get started with project management.
                </p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-6">
                  <h3 className="font-semibold">Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your construction projects
                  </p>
                </div>
                
                <div className="rounded-lg border p-6">
                  <h3 className="font-semibold">Schedule</h3>
                  <p className="text-sm text-muted-foreground">
                    Track project timelines and milestones
                  </p>
                </div>
                
                <div className="rounded-lg border p-6">
                  <h3 className="font-semibold">Budget</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor project costs and expenses
                  </p>
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}