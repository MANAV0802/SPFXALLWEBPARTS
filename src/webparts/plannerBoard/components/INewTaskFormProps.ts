export interface INewTaskFormProps {
  defaultBucket: string;
  onClose: () => void;
  refreshTasks: () => void;
  context: any;                    // 👈 Add this line
}

