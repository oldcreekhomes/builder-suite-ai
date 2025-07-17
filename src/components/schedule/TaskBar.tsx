import React from "react";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TaskBar(props: any) {
  return (
    <g>
      <rect
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        rx={4}
        ry={4}
        fill={props.isSelected ? props.styles.backgroundSelectedColor : props.styles.backgroundColor}
        className="gantt-bar"
      />
      {props.progressWidth > 0 && (
        <rect
          x={props.x}
          y={props.y + props.height * 0.4}
          width={props.progressWidth}
          height={props.height * 0.2}
          rx={2}
          ry={2}
          fill={props.isSelected ? props.styles.progressSelectedColor : props.styles.progressColor}
          className="gantt-bar-progress"
        />
      )}
      <foreignObject
        x={props.x + props.width - 26}
        y={props.y + 1}
        width={24}
        height={24}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            backgroundColor: "white",
            borderRadius: "50%",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            cursor: "pointer",
          }}
          className="edit-button"
          onClick={(e) => {
            e.stopPropagation();
            // Call the onEdit callback with this task's data
            if (props.onEdit) {
              props.onEdit(props.task);
            }
          }}
        >
          <Edit size={14} />
        </div>
      </foreignObject>
      <text
        x={props.x + 12}
        y={props.y + props.height / 2}
        fontSize={12}
        fill="#fff"
        dominantBaseline="middle"
      >
        {props.task.name}
      </text>
    </g>
  );
}