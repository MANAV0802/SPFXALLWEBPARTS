import * as React from "react";
import styles from "./PlannerBoard.module.scss";
import TaskService, { ITaskActivity, IPlannerTask } from "../services/TaskService";

interface IActivityModalProps {
  task: IPlannerTask | null;
  onClose: () => void;
}

const ActivityModal: React.FC<IActivityModalProps> = ({ task, onClose }) => {
  const [activity, setActivity] = React.useState<ITaskActivity[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (task) {
      loadActivity(task.Id);
    }
  }, [task]);

  const loadActivity = async (taskId: number) => {
    setLoading(true);
    const log = await TaskService.getActivityLog(taskId);
    setActivity(log);
    setLoading(false);
  };

  if (!task) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.activityModal}
        onClick={(e) => e.stopPropagation()} // Prevent close on modal click
      >
        {/* HEADER */}
        <h2 className={styles.modalTitle}>Activity Log – {task.Title}</h2>

        <button className={styles.closeButton} onClick={onClose}>
          ✖
        </button>

        {/* BODY */}
        {loading ? (
          <p>Loading activity...</p>
        ) : activity.length === 0 ? (
          <p>No activity found for this task.</p>
        ) : (
          <div className={styles.activityList}>
            {activity.map((a) => (
              <div key={a.Id} className={styles.activityItem}>
                <strong>{a.Title}</strong>

                <p>Action: {a.Action}</p>

                {a.OldBucket && <p>From: {a.OldBucket}</p>}
                {a.NewBucket && <p>To: {a.NewBucket}</p>}

                <p className={styles.timestamp}>
                  {new Date(a.Timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <button className={styles.activityCloseBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ActivityModal;
