import { IPlannerTask } from "../services/TaskService";  // <-- REQUIRED IMPORT

export interface IBucketColumnProps {
  bucketName: string;
  tasks: IPlannerTask[];
  onAddTaskClick: (bucket: string) => void;
  onBucketChange: (id: number, newBucket: string) => void;
  refreshTasks: () => void;
  onEditTask: (task: IPlannerTask) => void;
  onDeleteTask: (taskId: number) => void;
  onMoveTask: (taskId: number, newBucket: string) => void;

  // ⭐ ADD THIS
  onViewActivity: (task: IPlannerTask) => void;
}
