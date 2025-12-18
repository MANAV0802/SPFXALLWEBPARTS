import * as React from "react";
import { useState, useEffect } from "react";
import styles from "./PlannerBoard.module.scss";

import TaskService, { IPlannerTask } from "../services/TaskService";
import BucketColumn from "./BucketColumn";
import NewTaskForm from "./NewTaskForm";
import ActivityModal from "./ActivityModal";

import CalendarView from "./CalendarView";

export interface IPlannerBoardProps {
  context: any;
}

const bucketOrder = ["Backlog", "To Do", "In Progress", "Done"];

const Board: React.FC<IPlannerBoardProps> = (props) => {
  const [tasks, setTasks] = useState<IPlannerTask[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [defaultBucket, setDefaultBucket] = useState("Backlog");
  const [editingTask, setEditingTask] = useState<IPlannerTask | null>(null);

  const [activityTask, setActivityTask] = useState<IPlannerTask | null>(null);

  // ⭐ Updated — Removed "dashboard"
  const [activeView, setActiveView] = useState<"board" | "calendar">("board");

  /** Load tasks */
  const loadTasks = async () => {
    const data = await TaskService.getTasks();
    setTasks(data);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  /** Move task */
  const handleMoveTask = async (taskId: number, newBucket: string) => {
    await TaskService.updateTaskBucket(taskId, newBucket);
    loadTasks();
  };

  /** Edit task */
  const handleEditTask = (task: IPlannerTask) => {
    setEditingTask(task);
    setDefaultBucket(task.Bucket || "Backlog");
    setOpenForm(true);
    setActiveView("board"); // always edit in board view
  };

  /** Delete task */
  const handleDeleteTask = async (taskId: number) => {
    await TaskService.deleteTask(taskId);
    loadTasks();
  };

  /** Activity modal */
  const handleViewActivity = (task: IPlannerTask) => {
    setActivityTask(task);
  };

  const closeModal = () => {
    setOpenForm(false);
    setEditingTask(null);
  };

  return (
    <div className={styles.plannerWrapper}>
      
      {/* HEADER */}
      <div className={styles.plannerHeader}>
        <h2>Planner Board</h2>

        {/* ⭐ VIEW TOGGLE BUTTONS */}
        <div className={styles.viewToggle}>
          <button
            className={activeView === "board" ? styles.viewToggleActive : ""}
            onClick={() => setActiveView("board")}
          >
            Board
          </button>

          <button
            className={activeView === "calendar" ? styles.viewToggleActive : ""}
            onClick={() => setActiveView("calendar")}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* ⭐ BOARD VIEW */}
      {activeView === "board" && (
        <div className={styles.board}>
          {bucketOrder.map((bucket) => (
            <BucketColumn
              key={bucket}
              bucketName={bucket}
              tasks={tasks.filter((t) => t.Bucket === bucket)}
              onAddTaskClick={(b) => {
                setEditingTask(null);
                setDefaultBucket(b);
                setOpenForm(true);
              }}
              onBucketChange={handleMoveTask}
              refreshTasks={loadTasks}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onMoveTask={handleMoveTask}
              onViewActivity={handleViewActivity}
            />
          ))}
        </div>
      )}

      {/* ⭐ CALENDAR VIEW */}
      {activeView === "calendar" && (
        <CalendarView
          tasks={tasks}
          onTaskClick={(task) => handleEditTask(task)}
        />
      )}

      {/* POPUP ROOT */}
      <div id="popup-root" className={styles.popupRoot}></div>

      {/* TASK FORM MODAL */}
      {openForm && (
        <NewTaskForm
          defaultBucket={defaultBucket}
          onClose={closeModal}
          refreshTasks={loadTasks}
          context={props.context}
          editingTask={editingTask}
        />
      )}

      {/* ACTIVITY MODAL */}
      {activityTask && (
        <ActivityModal
          task={activityTask}
          onClose={() => setActivityTask(null)}
        />
      )}
    </div>
  );
};

export default Board;

