
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AddTaskDialog } from './AddTaskDialog';

export interface GanttTask {
  id: string;
  code: string;
  name: string;
  startDate: Date;
  duration: number;
  endDate: Date;
  progress: number;
  predecessor?: string;
  resources: string[];
}

interface GanttChartProps {
  projectId: string;
  tasks: GanttTask[];
  onAddTask: (task: Omit<GanttTask, 'id'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<GanttTask>) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  projectId,
  tasks,
  onAddTask,
  onUpdateTask
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const margin = { top: 40, right: 40, bottom: 40, left: 200 };
  const width = 1200 - margin.left - margin.right;
  const height = Math.max(400, tasks.length * 50) - margin.top - margin.bottom;

  useEffect(() => {
    if (!svgRef.current || tasks.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set up scales
    const timeExtent = d3.extent([
      ...tasks.map(d => d.startDate),
      ...tasks.map(d => d.endDate)
    ]) as [Date, Date];

    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(tasks.map(d => d.id))
      .range([0, height])
      .padding(0.1);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%m/%d'));
    
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    // Add task bars
    const taskGroups = g.selectAll('.task-group')
      .data(tasks)
      .enter()
      .append('g')
      .attr('class', 'task-group')
      .attr('transform', d => `translate(0,${yScale(d.id)})`);

    // Background bars
    taskGroups.append('rect')
      .attr('class', 'task-bg')
      .attr('x', d => xScale(d.startDate))
      .attr('width', d => xScale(d.endDate) - xScale(d.startDate))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#e2e8f0')
      .attr('stroke', '#cbd5e1')
      .attr('rx', 4);

    // Progress bars
    taskGroups.append('rect')
      .attr('class', 'task-progress')
      .attr('x', d => xScale(d.startDate))
      .attr('width', d => (xScale(d.endDate) - xScale(d.startDate)) * (d.progress / 100))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#3b82f6')
      .attr('rx', 4);

    // Task labels
    taskGroups.append('text')
      .attr('class', 'task-label')
      .attr('x', -10)
      .attr('y', yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#374151')
      .attr('font-size', '12px')
      .text(d => `${d.code}: ${d.name}`);

    // Add click handlers for task selection
    taskGroups
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedTaskId(d.id);
      });

  }, [tasks, width, height]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Project Gantt Chart</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="border rounded-lg p-4 bg-white overflow-x-auto">
        <svg
          ref={svgRef}
          width={width + margin.left + margin.right}
          height={height + margin.top + margin.bottom}
          className="w-full"
        />
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No tasks yet. Click "Add Task" to get started.</p>
        </div>
      )}

      <AddTaskDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddTask={onAddTask}
        existingTasks={tasks}
      />

      {selectedTaskId && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Selected task: {tasks.find(t => t.id === selectedTaskId)?.name}
          </p>
        </div>
      )}
    </div>
  );
};
