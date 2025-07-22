import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Calendar, Clock, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef, useState } from "react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

// Syncfusion Gantt imports
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Selection, Toolbar, Edit, Filter, Reorder, Resize, ContextMenu, ColumnMenu, ExcelExport, PdfExport, RowDD } from '@syncfusion/ej2-react-gantt';

// Import Syncfusion styles ONLY for this component
import "../styles/syncfusion.css";
import styles from "../styles/ProjectSchedule.module.css";
import { sampleProjectData, resourceCollection } from "../data/sampleProjectData";
import { GanttAddTaskButtons } from "@/components/GanttAddTaskButtons";
import { generateHierarchicalIds, getNextHierarchicalId, determineAddContext, regenerateHierarchicalIds, type TaskWithHierarchicalId } from "../utils/hierarchicalIds";

export default function ProjectSchedule() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const ganttRef = useRef(null);
  
  // State for tracking selected task for better add context
  const [selectedTask, setSelectedTask] = useState<TaskWithHierarchicalId | null>(null);

  // State for custom delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Flag to prevent infinite loop when we programmatically add tasks
  const [isAddingTask, setIsAddingTask] = useState(false);

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

  // Optimized event handler to prevent infinite loops
  const actionBegin = (args: any) => {
    // CRITICAL: Only intercept if we're NOT already in the middle of adding a task programmatically
    if (isAddingTask) {
      return; // Let the programmatic addition proceed normally
    }
    
    // Handle ALL possible user-initiated add scenarios
    if (args.requestType === 'beforeOpenAddDialog' || 
        args.requestType === 'beforeAdd' || 
        args.requestType === 'add') {
      
      // Cancel user-initiated add dialog or behavior - we'll handle it manually
      args.cancel = true;
      
      // Use intelligent context detection for proper placement
      const currentData = ganttRef.current ? (ganttRef.current as any).currentViewData : processedProjectData;
      const addContext = determineAddContext(selectedTask, currentData);
      
      // Create and add the new task with proper hierarchical ID
      handleAddTask(addContext.type, addContext.parentId);
    }
  };

  // Optimized manual task addition with immediate updates
  const handleAddTask = (type: 'root' | 'child' | 'sibling', explicitParentId?: string) => {
    if (!ganttRef.current) return;
    
    // Set flag to prevent re-entry
    setIsAddingTask(true);
    
    const ganttInstance = ganttRef.current as any;
    const currentData = ganttInstance.currentViewData || processedProjectData;
    
    let parentId: string | undefined = undefined;
    
    // Determine parent ID based on add type
    switch (type) {
      case 'root':
        parentId = undefined;
        break;
      case 'child':
        parentId = explicitParentId || selectedTask?.TaskID;
        break;
      case 'sibling':
        parentId = explicitParentId || selectedTask?.parentID;
        break;
    }
    
    // Generate the next hierarchical ID
    const nextId = getNextHierarchicalId(currentData, parentId);
    
    // Create new task with proper hierarchical ID and default values
    const newTask = {
      TaskID: nextId,
      TaskName: `New Task ${nextId}`,
      StartDate: new Date(),
      Duration: 1,
      Progress: 0,
      parentID: parentId,
      Resources: [1] // Default to Project Manager
    };
    
    // Use Syncfusion's batching for smooth updates
    ganttInstance.showSpinner();
    ganttInstance.beginUpdate();
    
    try {
      // Add the task to the Gantt chart
      ganttInstance.addRecord(newTask);
      
      // Immediately regenerate hierarchical IDs with the original working algorithm
      const currentFullData = ganttInstance.dataSource || ganttInstance.currentViewData;
      const reorderedData = regenerateHierarchicalIds(currentFullData);
      
      // Update data source efficiently
      ganttInstance.dataSource = reorderedData;
    } finally {
      // Complete the batch update for smooth rendering
      ganttInstance.endUpdate();
      ganttInstance.hideSpinner();
      
      // Clear the flag immediately - no delay needed
      setIsAddingTask(false);
    }
  };

  // Optimized event handler for completed actions
  const actionComplete = (args: any) => {
    // Handle scenarios that might result in data changes requiring ID regeneration
    if (args.requestType === 'rowDropped' || 
        args.requestType === 'rowdrop' ||
        args.requestType === 'delete' ||
        args.requestType === 'save') {
      
      // Only regenerate if not already adding (to avoid conflicts)
      if (!isAddingTask && ganttRef.current) {
        const ganttInstance = ganttRef.current as any;
        
        // Use the original working regeneration algorithm with performance batching
        ganttInstance.showSpinner();
        ganttInstance.beginUpdate();
        
        try {
          const currentData = ganttInstance.dataSource || ganttInstance.currentViewData;
          const reorderedData = regenerateHierarchicalIds(currentData);
          ganttInstance.dataSource = reorderedData;
        } finally {
          ganttInstance.endUpdate();
          ganttInstance.hideSpinner();
        }
      }
    }
  };

  // Selection change handler to track selected task
  const onSelectionChange = (args: any) => {
    if (args.data && args.data.length > 0) {
      const selected = args.data[0];
      setSelectedTask(selected);
    } else {
      setSelectedTask(null);
    }
  };

  // Updated toolbar options - keeping Add for now but it will be intercepted
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
                <GanttAddTaskButtons
                  onAddTask={handleAddTask}
                  selectedTaskName={selectedTask?.TaskName}
                  hasSelection={!!selectedTask}
                />
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-6 w-6" />
                <h2 className="text-2xl font-bold tracking-tight">Schedule Overview</h2>
              </div>
              
              {selectedTask && (
                <div className="text-sm text-gray-600">
                  Selected: <span className="font-medium">{selectedTask.TaskName}</span> ({selectedTask.TaskID})
                </div>
              )}
            </div>

            {/* Optimized Syncfusion Gantt Chart with fast ID management */}
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
                    rowSelected={onSelectionChange}
                    rowDeselected={() => setSelectedTask(null)}
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
