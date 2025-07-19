
import React, { useEffect, useState } from 'react';
import { Edit } from 'lucide-react';

// Component to add edit buttons next to each task
export function EditButton({ 
  taskId, 
  onEdit 
}: { 
  taskId: string; 
  onEdit: (taskId: string) => void 
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const positionButton = () => {
      const taskBar = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement;
      
      if (taskBar) {
        const rect = taskBar.getBoundingClientRect();
        setPosition({
          top: rect.top + rect.height / 2 - 12,
          left: rect.right - 30
        });
      }
    };

    positionButton();
    
    const observer = new ResizeObserver(positionButton);
    const ganttElement = document.querySelector('.gantt-chart');
    if (ganttElement) {
      observer.observe(ganttElement);
    }

    return () => {
      if (ganttElement) {
        observer.unobserve(ganttElement);
      }
      observer.disconnect();
    };
  }, [taskId]);

  return (
    <div 
      className="absolute bg-white rounded-full p-1 cursor-pointer shadow-sm hover:shadow-md z-50"
      style={{ 
        top: position.top + 'px', 
        left: position.left + 'px',
        transform: 'translate(-50%, -50%)'
      }}
      onClick={() => onEdit(taskId)}
    >
      <Edit size={16} />
    </div>
  );
}
