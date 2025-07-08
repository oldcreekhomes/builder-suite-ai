import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

interface Task {
  id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  progress: number;
  assigned_to?: string;
  color: string;
}

interface GanttChartProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick?: (task: Task) => void;
}

export function GanttChart({ tasks, onTaskUpdate, onTaskClick }: GanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: Math.max(400, tasks.length * 40 + 100)
          });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [tasks.length]);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || tasks.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 50, right: 20, bottom: 20, left: 200 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Parse dates and find date range
    const allDates = tasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.end_date)
    ]);
    
    const minDate = startOfWeek(d3.min(allDates) || new Date());
    const maxDate = endOfWeek(d3.max(allDates) || addDays(new Date(), 30));

    // Create scales
    const xScale = d3.scaleTime()
      .domain([minDate, maxDate])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(tasks.map(task => task.id))
      .range([0, height])
      .padding(0.1);

    // Create main container
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create timeline header
    const timelineHeader = g.append("g")
      .attr("class", "timeline-header");

    // Add week headers
    const weeks = eachDayOfInterval({ start: minDate, end: maxDate }, { step: 7 });
    
    timelineHeader.selectAll(".week-header")
      .data(weeks)
      .join("text")
      .attr("class", "week-header")
      .attr("x", d => xScale(d))
      .attr("y", -30)
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text(d => format(d, 'MMM d'));

    // Add grid lines
    const gridLines = g.append("g")
      .attr("class", "grid-lines");

    weeks.forEach(week => {
      gridLines.append("line")
        .attr("x1", xScale(week))
        .attr("x2", xScale(week))
        .attr("y1", -40)
        .attr("y2", height)
        .style("stroke", "#e5e7eb")
        .style("stroke-width", 1);
    });

    // Create task bars
    const taskGroups = g.selectAll(".task-group")
      .data(tasks)
      .join("g")
      .attr("class", "task-group")
      .attr("transform", d => `translate(0, ${yScale(d.id)})`);

    // Task background bars
    taskGroups.append("rect")
      .attr("class", "task-bg")
      .attr("x", d => xScale(new Date(d.start_date)))
      .attr("width", d => xScale(new Date(d.end_date)) - xScale(new Date(d.start_date)))
      .attr("height", yScale.bandwidth())
      .attr("rx", 4)
      .style("fill", "#f3f4f6")
      .style("stroke", "#d1d5db")
      .style("stroke-width", 1);

    // Task progress bars
    taskGroups.append("rect")
      .attr("class", "task-progress")
      .attr("x", d => xScale(new Date(d.start_date)))
      .attr("width", d => {
        const totalWidth = xScale(new Date(d.end_date)) - xScale(new Date(d.start_date));
        return totalWidth * (d.progress / 100);
      })
      .attr("height", yScale.bandwidth())
      .attr("rx", 4)
      .style("fill", d => d.color)
      .style("opacity", 0.8);

    // Task text
    taskGroups.append("text")
      .attr("class", "task-text")
      .attr("x", d => xScale(new Date(d.start_date)) + 8)
      .attr("y", yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#111827")
      .style("pointer-events", "none")
      .text(d => `${d.task_name} (${d.progress}%)`);

    // Add click handlers
    taskGroups
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (onTaskClick) {
          onTaskClick(d);
        }
      });

    // Add today line
    const today = new Date();
    if (today >= minDate && today <= maxDate) {
      g.append("line")
        .attr("class", "today-line")
        .attr("x1", xScale(today))
        .attr("x2", xScale(today))
        .attr("y1", -40)
        .attr("y2", height)
        .style("stroke", "#ef4444")
        .style("stroke-width", 2)
        .style("stroke-dasharray", "4,4");

      g.append("text")
        .attr("x", xScale(today))
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "600")
        .style("fill", "#ef4444")
        .text("Today");
    }

  }, [tasks, dimensions, onTaskClick]);

  return (
    <div className="w-full overflow-x-auto border border-border rounded-lg bg-background">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full"
      />
    </div>
  );
}