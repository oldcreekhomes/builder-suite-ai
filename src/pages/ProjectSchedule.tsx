import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Calendar, Clock, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef } from "react";

// Syncfusion Gantt imports
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Selection, Toolbar, Edit, Filter, Reorder, Resize, ContextMenu, ColumnMenu, ExcelExport, PdfExport, RowDD } from '@syncfusion/ej2-react-gantt';

// Import Syncfusion styles ONLY for this component
import "../styles/syncfusion.css";
import styles from "../styles/ProjectSchedule.module.css";
import { sampleProjectData, resourceCollection } from "../data/sampleProjectData";
import { generateHierarchicalIds, getNextHierarchicalId, regenerateHierarchicalIds, type TaskWithHierarchicalId } from "../utils/hierarchicalIds";

export default function ProjectSchedule() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const ganttRef = useRef(null);

  // Fetch project data to get the address
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        throw error;
      }

      return data;
    },
    enabled: !!projectId,
  });

  // Process sample data with hierarchical IDs
  const processedProjectData = generateHierarchicalIds(sampleProjectData);

  // Gantt configuration
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    parentID: 'parentID',
    child: 'subtasks',
    resourceInfo: 'Resources'
  };

  // Resource fields configuration
  const resourceFields = {
    id: 'resourceId',
    name: 'resourceName',
    unit: 'resourceUnit',
    group: 'resourceGroup'
  };

  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true,
    showDeleteConfirmDialog: true,
    newRowPosition: "Bottom" as any
  };

  // Enhanced event handler for adding tasks
  const actionBegin = (args: any) => {
    console.log('=== DEBUG: actionBegin triggered ===');
    console.log('Action requestType:', args.requestType);
    
    if (args.requestType === 'beforeOpenAddDialog') {
      args.cancel = true;
      
      // Get currently selected task to determine parent context
      let parentId: string | undefined = undefined;
      
      if (ganttRef.current) {
        const ganttInstance = ganttRef.current as any;
        const selectedRecords = ganttInstance.getSelectedRecords();
        
        if (selectedRecords && selectedRecords.length > 0) {
          const selectedTask = selectedRecords[0];
          parentId = selectedTask.TaskID;
        }
      }
      
      // Get the current data to determine next ID
      const currentData = ganttRef.current ? (ganttRef.current as any).currentViewData : processedProjectData;
      const nextId = getNextHierarchicalId(currentData, parentId);
      
      // Create new task with proper hierarchical ID, parent relationship, and default resource
      const newTask = {
        TaskID: nextId,
        TaskName: 'New Task',
        StartDate: new Date(),
        Duration: 1,
        Progress: 0,
        parentID: parentId,
        Resources: [1] // Default to Project Manager
      };
      
      if (ganttRef.current) {
        (ganttRef.current as any).addRecord(newTask);
      }
    }
  };

  // Enhanced event handler for completed actions (including row reordering and new task additions)
  const actionComplete = (args: any) => {
    console.log('=== DEBUG: actionComplete triggered ===');
    console.log('Action requestType:', args.requestType);
    console.log('Action data:', args.data);
    
    if (args.requestType === 'rowDropped' || args.requestType === 'rowdrop') {
      console.log('DEBUG: Row reordering detected, regenerating hierarchical IDs');
      
      if (ganttRef.current) {
        const ganttInstance = ganttRef.current as any;
        const currentData = ganttInstance.currentViewData;
        
        console.log('DEBUG: Current data before ID regeneration:', currentData?.length);
        console.log('DEBUG: Sample current data structure:', currentData?.slice(0, 3));
        
        // Regenerate hierarchical IDs based on new order
        const updatedData = regenerateHierarchicalIds(currentData);
        
        console.log('DEBUG: Updated data after ID regeneration:', updatedData?.length);
        console.log('DEBUG: Sample updated data structure:', updatedData?.slice(0, 3));
        
        // Update the data source with new hierarchical structure
        if (updatedData && updatedData.length > 0) {
          console.log('DEBUG: Updating Gantt data source with regenerated IDs');
          ganttInstance.dataSource = updatedData;
          ganttInstance.refresh();
        }
        
        console.log('DEBUG: Hierarchical IDs regenerated successfully');
      }
    } else if (args.requestType === 'save' || args.requestType === 'add') {
      console.log('DEBUG: New task addition detected, assigning hierarchical ID');
      
      if (ganttRef.current) {
        const ganttInstance = ganttRef.current as any;
        const currentData = ganttInstance.currentViewData;
        
        // Find tasks with non-hierarchical IDs (numeric only, like "23", "24")
        const tasksNeedingHierarchicalIds = currentData.filter((task: any) => {
          const idStr = String(task.TaskID);
          // Check if it's purely numeric (no dots) and greater than expected hierarchical range
          return /^\d+$/.test(idStr) && parseInt(idStr) > 20;
        });
        
        console.log('DEBUG: Tasks needing hierarchical IDs:', tasksNeedingHierarchicalIds.length);
        
        if (tasksNeedingHierarchicalIds.length > 0) {
          // For each task needing a hierarchical ID, determine its proper position
          tasksNeedingHierarchicalIds.forEach((task: any) => {
            console.log('DEBUG: Processing task for hierarchical ID:', task.TaskID, task.TaskName);
            
            // Find the task's position in the current data to determine context
            const taskIndex = currentData.findIndex((t: any) => t.TaskID === task.TaskID);
            let parentId: string | undefined = undefined;
            
            // Look for parent context by examining surrounding tasks
            if (taskIndex > 0) {
              // Check previous tasks to find a potential parent
              for (let i = taskIndex - 1; i >= 0; i--) {
                const prevTask = currentData[i];
                // If previous task has no parent, it could be our parent
                if (!prevTask.parentID) {
                  parentId = prevTask.TaskID;
                  break;
                }
                // If previous task has the same parent as we should have
                if (prevTask.parentID && !task.parentID) {
                  parentId = prevTask.parentID;
                  break;
                }
              }
            }
            
            // If we found a parent context, assign it to the task
            if (parentId) {
              task.parentID = parentId;
            }
            
            console.log('DEBUG: Determined parent context for task:', task.TaskID, 'parent:', parentId);
          });
          
          // Now regenerate all hierarchical IDs to ensure proper sequential numbering
          const updatedData = regenerateHierarchicalIds(currentData);
          
          console.log('DEBUG: Regenerated hierarchical IDs after new task addition');
          console.log('DEBUG: Sample updated tasks:', updatedData.slice(0, 10).map(t => ({ id: t.TaskID, name: t.TaskName, parent: t.parentID })));
          
          // Update the data source with new hierarchical structure
          if (updatedData && updatedData.length > 0) {
            ganttInstance.dataSource = updatedData;
            ganttInstance.refresh();
            console.log('DEBUG: Gantt chart refreshed with new hierarchical IDs');
          }
        }
      }
    }
  };

  // Updated toolbar options
  const toolbarOptions = [
    'Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll',
    'Search', 'ZoomIn', 'ZoomOut', 'ZoomToFit', 'PdfExport'
  ];

  const splitterSettings = {
    columnIndex: 4
  };

  const projectStartDate = new Date('2024-01-15');
  const projectEndDate = new Date('2024-04-15');

  const labelSettings = {
    leftLabel: 'TaskName',
    rightLabel: 'Progress'
  };

  const timelineSettings = {
    showTooltip: true,
    topTier: {
      unit: 'Week' as any,
      format: 'dd/MM/yyyy'
    },
    bottomTier: {
      unit: 'Day' as any,
      count: 1
    }
  };

  if (!projectId) {
    return <div>Project not found</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="text-gray-600 hover:text-black" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/project/${projectId}`)}
                  className="text-gray-600 hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-black">Project Schedule</h1>
                  {project?.address && (
                    <p className="text-sm text-gray-600">{project.address}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </Button>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-6 w-6" />
                <h2 className="text-2xl font-bold tracking-tight">Schedule Overview</h2>
              </div>
            </div>

            {/* Enhanced Syncfusion Gantt Chart with dynamic ID reordering */}
            <div className={`${styles.scheduleContainer} syncfusion-schedule-container`}>
              <div className={styles.syncfusionWrapper}>
                <div className={styles.contentArea}>
                  <GanttComponent 
                    ref={ganttRef}
                    dataSource={processedProjectData}
                    resources={resourceCollection}
                    taskFields={taskFields}
                    resourceFields={resourceFields}
                    editSettings={editSettings}
                    allowSelection={true}
                    allowResizing={true}
                    allowReordering={true}
                    allowFiltering={true}
                    allowExcelExport={true}
                    allowPdfExport={true}
                    allowRowDragAndDrop={true}
                    enableContextMenu={true}
                    showColumnMenu={true}
                    highlightWeekends={true}
                    toolbar={toolbarOptions}
                    splitterSettings={splitterSettings}
                    projectStartDate={projectStartDate}
                    projectEndDate={projectEndDate}
                    labelSettings={labelSettings}
                    timelineSettings={timelineSettings}
                    actionBegin={actionBegin}
                    actionComplete={actionComplete}
                    height="600px"
                    gridLines="Both"
                  >
                    <ColumnsDirective>
                      <ColumnDirective field='TaskID' headerText='ID' width='80' isPrimaryKey={true} />
                      <ColumnDirective field='TaskName' headerText='Task Name' width='250' />
                      <ColumnDirective field='StartDate' headerText='Start Date' width='120' />
                      <ColumnDirective field='Duration' headerText='Duration' width='100' />
                      <ColumnDirective field='EndDate' headerText='End Date' width='120' />
                      <ColumnDirective field='Progress' headerText='Progress' width='100' />
                      <ColumnDirective field='Predecessor' headerText='Dependency' width='120' />
                      <ColumnDirective field='Resources' headerText='Resources' width='150' />
                    </ColumnsDirective>
                    <Inject services={[Selection, Toolbar, Edit, Filter, Reorder, Resize, ContextMenu, ColumnMenu, ExcelExport, PdfExport, RowDD]} />
                  </GanttComponent>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
