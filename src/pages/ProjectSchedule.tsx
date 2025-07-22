
import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Calendar, Clock, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRef, useState } from "react";
import { useProject } from "@/hooks/useProject";
import { useProjectTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useProjectTasks";

// Syncfusion Gantt imports
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Selection, Toolbar, Edit, Filter, Reorder, Resize, ContextMenu, ColumnMenu, ExcelExport, PdfExport, RowDD } from '@syncfusion/ej2-react-gantt';

// Import Syncfusion styles ONLY for this component
import "../styles/syncfusion.css";
import styles from "../styles/ProjectSchedule.module.css";

export default function ProjectSchedule() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const ganttRef = useRef(null);
  
  // State for tracking selected task
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Fetch project data and tasks
  const { data: project, isLoading: projectLoading } = useProject(projectId || "");
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useProjectTasks(projectId || "");
  
  // Mutations for CRUD operations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Create simple resource collection for tasks
  const resourceCollection = [
    { resourceId: 1, resourceName: 'Project Manager', resourceUnit: 100, resourceGroup: 'Management' },
    { resourceId: 2, resourceName: 'Developer', resourceUnit: 100, resourceGroup: 'Development' },
    { resourceId: 3, resourceName: 'Designer', resourceUnit: 100, resourceGroup: 'Design' },
    { resourceId: 4, resourceName: 'Tester', resourceUnit: 100, resourceGroup: 'QA' }
  ];

  // Transform tasks to show sequential numbering for display
  const projectData = tasks.map((task, index) => ({
    ...task,
    TaskID: task.TaskID, // Keep original UUID for database operations
    DisplayID: index + 1, // Sequential number for display
  }));

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
    newRowPosition: 'Bottom' // Add new tasks at the bottom
  };

  // Database event handlers for Syncfusion CRUD operations
  const handleActionBegin = async (args: any) => {
    if (!projectId) return;

    try {
      // Cancel dialog for direct task creation
      if (args.requestType === 'beforeOpenAddDialog') {
        args.cancel = true;
        
        // Create new task directly at bottom
        const newTaskData = {
          project_id: projectId,
          task_name: 'New Task',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration: 1,
          progress: 0,
          predecessor: null,
          resources: null,
          parent_id: null,
          order_index: tasks.length, // Position at bottom
        };

        const result = await createTaskMutation.mutateAsync(newTaskData);
        console.log('Task created:', result);
        return;
      }
      
      if (args.requestType === 'add') {
        // Handle task creation
        const newTask = args.data;
        const taskData = {
          project_id: projectId,
          task_name: newTask.TaskName || 'New Task',
          start_date: newTask.StartDate?.toISOString() || new Date().toISOString(),
          end_date: newTask.EndDate?.toISOString() || new Date().toISOString(),
          duration: newTask.Duration || 1,
          progress: newTask.Progress || 0,
          predecessor: newTask.Predecessor || null,
          resources: newTask.Resources || null,
          parent_id: newTask.parentID || null,
          order_index: tasks.length,
        };

        const result = await createTaskMutation.mutateAsync(taskData);
        // Update the task with the new ID from database
        args.data.TaskID = result.id;
        
      } else if (args.requestType === 'save') {
        // Handle task update
        const updatedTask = args.data;
        await updateTaskMutation.mutateAsync({
          id: updatedTask.TaskID,
          task_name: updatedTask.TaskName,
          start_date: updatedTask.StartDate?.toISOString(),
          end_date: updatedTask.EndDate?.toISOString(),
          duration: updatedTask.Duration,
          progress: updatedTask.Progress,
          predecessor: updatedTask.Predecessor,
          resources: updatedTask.Resources,
          parent_id: updatedTask.parentID,
        });
        
      } else if (args.requestType === 'delete') {
        // Handle task deletion
        const deletedTask = args.data[0];
        await deleteTaskMutation.mutateAsync(deletedTask.TaskID);
      }
    } catch (error) {
      console.error('Database operation failed:', error);
      args.cancel = true; // Cancel the operation if database fails
    }
  };

  const handleActionComplete = (args: any) => {
    // Refetch data after successful operations
    if (['add', 'save', 'delete', 'beforeOpenAddDialog'].includes(args.requestType)) {
      refetchTasks();
    }
  };

  // Direct task addition without dialog
  const handleAddTask = async () => {
    if (!projectId) return;
    
    try {
      const newTaskData = {
        project_id: projectId,
        task_name: 'New Task',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 1,
        progress: 0,
        predecessor: null,
        resources: null,
        parent_id: null,
        order_index: tasks.length,
      };

      await createTaskMutation.mutateAsync(newTaskData);
      console.log('Task added directly');
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  // Simple selection handler
  const onSelectionChange = (args: any) => {
    if (args.data && args.data.length > 0) {
      const selected = args.data[0];
      setSelectedTask(selected);
      console.log('Selected task:', selected.TaskID, selected.TaskName);
    } else {
      setSelectedTask(null);
    }
  };

  // Native toolbar options
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
              
              <div className="flex items-center space-x-2">
                <Button onClick={handleAddTask} className="flex items-center space-x-2">
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
              
              {selectedTask && (
                <div className="text-sm text-gray-600">
                  Selected: <span className="font-medium">{selectedTask.TaskName}</span> (#{selectedTask.DisplayID})
                </div>
              )}
            </div>

            {/* Syncfusion Gantt Chart with restored functionality */}
            <div className={`${styles.scheduleContainer} syncfusion-schedule-container`}>
              <div className={styles.syncfusionWrapper}>
                <div className={styles.contentArea}>
                  <GanttComponent 
                    ref={ganttRef}
                    dataSource={projectData}
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
                    rowSelected={onSelectionChange}
                    rowDeselected={() => setSelectedTask(null)}
                    actionBegin={handleActionBegin}
                    actionComplete={handleActionComplete}
                    height="600px"
                    gridLines="Both"
                  >
                    <ColumnsDirective>
                      <ColumnDirective field='DisplayID' headerText='#' width='60' isPrimaryKey={false} />
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
