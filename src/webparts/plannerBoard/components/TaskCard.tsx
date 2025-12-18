import * as React from "react";
import * as ReactDOM from "react-dom";
import styles from "./PlannerBoard.module.scss";
import TaskService, { IPlannerTask } from "../services/TaskService";

interface ITaskCardProps {
  task: IPlannerTask;
  onEdit: (task: IPlannerTask) => void;
  onDelete: (id: number) => void;
  onMove: (taskId: number, bucket: string) => void;
  onViewActivity: (task: IPlannerTask) => void;
}

const TaskCard: React.FC<ITaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onMove,
  onViewActivity,
}) => {

  /** LOCAL STATE COPY → required to re-render */
  const [taskData, setTaskData] = React.useState<IPlannerTask>(task);

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);

  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const moveRef = React.useRef<HTMLDivElement>(null);

  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0 });
  const [movePos, setMovePos] = React.useState({ top: 0, left: 0 });

  /** Create popup root */
  const getPortalRoot = () => {
  let root = document.getElementById("popup-root") as HTMLDivElement;

  if (!root) {
    root = document.createElement("div");
    root.id = "popup-root";
    root.style.position = "absolute";
    root.style.top = "0";
    root.style.left = "0";
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.pointerEvents = "auto";   // 👈 FIXED
    root.style.zIndex = "9999";          // 👈 Fix popup behind card
    document.body.appendChild(root);
  }
  return root;
};

  /** Close popups on outside click */
  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        moveRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      )
        return;

      setMenuOpen(false);
      setMoveOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /** Open menu */
  const openMenu = () => {
    const rect = buttonRef.current!.getBoundingClientRect();
    const rootRect = getPortalRoot().getBoundingClientRect();

    setMenuPos({
      top: rect.bottom - rootRect.top + 10,
      left: rect.left - rootRect.left - 140,
    });

    setMenuOpen(true);
  };

  /** Open Move popup */
  const openMove = () => {
    const rect = buttonRef.current!.getBoundingClientRect();
    const rootRect = getPortalRoot().getBoundingClientRect();

    setMovePos({
      top: rect.bottom - rootRect.top + 10,
      left: rect.left - rootRect.left - 140,
    });

    setMoveOpen(true);
    setMenuOpen(false);
  };

  const Portal: React.FC<{ children: any }> = ({ children }) =>
    ReactDOM.createPortal(children, getPortalRoot());

  /** Bucket color */
  const bucketClassMap: Record<string, string> = {
    Backlog: styles.taskCardBacklog,
    "To Do": styles.taskCardToDo,
    "In Progress": styles.taskCardInProgress,
    Done: styles.taskCardDone,
  };

  const bucketClass = bucketClassMap[taskData.Bucket ?? ""] || "";

  /** Toggle checklist */
  const toggleChecklist = async (index: number) => {
    const updated = [...(taskData.Checklist || [])];
    updated[index].done = !updated[index].done;

    await TaskService.updateChecklist(taskData.Id, updated);
    setTaskData({ ...taskData, Checklist: updated });
  };

  return (
    <div className={`${styles.taskCard} ${bucketClass}`}>
      <div className={styles.cardHeader}>
        <h4 className={styles.taskTitle}>{taskData.Title}</h4>

        <button ref={buttonRef} className={styles.menuButton} onClick={openMenu}>
          ⋯
        </button>
      </div>

      {/* ✅ PRIORITY BADGE */}
      {taskData.Priority && (
        <span
          className={`${styles.priorityTag} ${
            taskData.Priority === "High"
              ? styles.priorityHigh
              : taskData.Priority === "Medium"
              ? styles.priorityMedium
              : styles.priorityLow
          }`}
        >
          {taskData.Priority} Priority
        </span>
      )}

      {/* DESCRIPTION */}
      <p className={styles.taskDescription}>{taskData.Description}</p>

      {/* CONTEXT MENU */}
      {menuOpen && (
        <Portal>
          <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{
              top: menuPos.top,
              left: menuPos.left,
              pointerEvents: "auto",
            }}
          >
            <div className={styles.menuItem} onClick={() => onEdit(taskData)}>
              ✏️ Edit
            </div>

            <div className={styles.menuItem} onClick={() => onDelete(taskData.Id)}>
              ❌ Delete
            </div>

            <div className={styles.menuItem} onClick={() => onViewActivity(taskData)}>
              📘 View Activity
            </div>

            <div className={styles.menuItem} onClick={openMove}>
              ↪️ Move To
            </div>
          </div>
        </Portal>
      )}

      {/* MOVE POPUP */}
      {moveOpen && (
        <Portal>
          <div
            ref={moveRef}
            className={styles.movePopup}
            style={{
              top: movePos.top,
              left: movePos.left,
              pointerEvents: "auto",
            }}
          >
            <div className={styles.moveTitle}>Move Task To</div>

            {["Backlog", "To Do", "In Progress", "Done"].map((b) => (
              <div
                key={b}
                className={styles.moveOption}
                onClick={() => onMove(taskData.Id, b)}
              >
                {b}
              </div>
            ))}

            <button className={styles.popupClose} onClick={() => setMoveOpen(false)}>
              Close
            </button>
          </div>
        </Portal>
      )}

      {/* CHECKLIST + PROGRESS */}
      {taskData.Checklist && taskData.Checklist.length > 0 && (
        <div className={styles.taskChecklist}>
          {(() => {
            const total = taskData.Checklist.length;
            const done = taskData.Checklist.filter((i) => i.done).length;
            const percent = Math.round((done / total) * 100);

            return (
              <div className={styles.checkProgressWrapper}>
                <div className={styles.checkProgressBar}>
                  <div
                    className={styles.checkProgressFill}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                <span className={styles.checkProgressText}>
                  {done}/{total} completed ({percent}%)
                </span>
              </div>
            );
          })()}

          {taskData.Checklist.map((item, index) => (
            <div key={index} className={styles.checkItem}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklist(index)}
              />
              <span className={item.done ? styles.checkDone : ""}>{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
