import { useNavigate, useParams } from "react-router-dom";
import { ProjectPickerPopover } from "@/components/projects/ProjectPickerPopover";

export function ProjectSelector() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  return (
    <div className="px-4 py-3 border-b border-border bg-white">
      <ProjectPickerPopover
        value={projectId}
        onSelect={(project) => navigate(`/project/${project.id}`)}
        placeholder="Select Project"
        showEditButton
      />
    </div>
  );
}
