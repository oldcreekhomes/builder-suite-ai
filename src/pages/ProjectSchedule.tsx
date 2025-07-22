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

  // New event handler for completed actions (including row reordering)
  const actionComplete = (args: any) => {
    console.log('=== DEBUG: actionComplete triggered ===');
    console.log('Action requestType:', args.requestType);
    
    if (args.requestType === 'rowDropped' || args.requestType === 'rowdrop') {
      console.log('DEBUG: Row reordering detected, regenerating hierarchical IDs');
      
      if (ganttRef.current) {
        const ganttInstance = ganttRef.current as any;
        const currentData = ganttInstance.currentViewData;
        
        console.log('DEBUG: Current data before ID regeneration:', currentData?.length);
        
        // Regenerate hierarchical IDs based on new order
        const updatedData = regenerateHierarchicalIds(currentData);
        
        console.log('DEBUG: Updated data after ID regeneration:', updatedData?.length);
        
        // Update each record with new hierarchical ID
        updatedData.forEach((task: TaskWithHierarchicalId) => {
          ganttInstance.updateRecordByID(task.TaskID, task);
        });
        
        console.log('DEBUG: Hierarchical IDs regenerated successfully');
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
