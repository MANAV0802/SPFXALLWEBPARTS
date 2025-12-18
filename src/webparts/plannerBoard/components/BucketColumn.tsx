import * as React from "react";
import styles from "./PlannerBoard.module.scss";
import { IBucketColumnProps } from "./IBucketColumnProps";
import TaskCard from "./TaskCard";

const BucketColumn: React.FC<IBucketColumnProps> = ({
  bucketName,
  tasks,
  onAddTaskClick,
  onBucketChange,
  refreshTasks,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onViewActivity,
}) => {
  
  /** -------------------------------
   *  BUCKET COLOR CLASS FOR BORDER
   --------------------------------*/
  const bucketClassMap: Record<string, string> = {
    Backlog: styles.Backlog,
    "To Do": styles.ToDo,
    "In Progress": styles.InProgress,
    Done: styles.Done,
  };

  /** --------------------------------------
   *  BUTTON COLOR BASED ON BUCKET NAME
   ---------------------------------------*/
  const getButtonColorClass = (bucket: string): string => {
    switch (bucket) {
      case "Backlog":
        return styles.addBacklog;
      case "To Do":
        return styles.addToDo;
      case "In Progress":
        return styles.addInProgress;
      case "Done":
        return styles.addDone;
      default:
        return "";
    }
  };

  return (
    <div className={`${styles.bucketColumn} ${bucketClassMap[bucketName]}`}>
      
      {/* ---------------- BUCKET HEADER ---------------- */}
      <div className={styles.bucketHeader}>
        <h3>{bucketName}</h3>

        {/* + BUTTON WITH DYNAMIC COLOR */}
        <button
          className={`${styles.bucketAddButton} ${getButtonColorClass(bucketName)}`}
          onClick={() => onAddTaskClick(bucketName)}
        >
          +
        </button>
      </div>

      {/* ---------------- TASK LIST ---------------- */}
      <div className={styles.bucketBody}>
        {tasks.map((task) => (
          <TaskCard
            key={task.Id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onMove={onMoveTask}
            onViewActivity={() => onViewActivity(task)}
          />
        ))}
      </div>

    </div>
  );
};

export default BucketColumn;
