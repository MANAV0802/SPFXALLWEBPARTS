import { IPlannerTask } from "../services/TaskService";

export interface ITaskCardProps {
  task: IPlannerTask;
  onEdit: (task: IPlannerTask) => void;
  onDelete: (taskId: number) => void;
  onMove: (taskId: number, bucket: string) => void;

  onViewActivity: (task: IPlannerTask) => void; // ⭐ ADD THIS
}
