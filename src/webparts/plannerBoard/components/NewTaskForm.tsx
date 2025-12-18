import * as React from "react";
import styles from "./PlannerBoard.module.scss";
import TaskService, { IPlannerTask, IChecklistItem } from "../services/TaskService";

export interface INewTaskFormProps {
  defaultBucket: string;
  onClose: () => void;
  refreshTasks: () => void;
  context: any;
  editingTask?: IPlannerTask | null;
}

import { DatePicker, DayOfWeek } from "@fluentui/react";

const NewTaskForm: React.FC<INewTaskFormProps> = ({
  defaultBucket,
  onClose,
  refreshTasks,
  context,
  editingTask,
}) => {
  const isEdit = !!editingTask;

  const [bucket] = React.useState(editingTask?.Bucket || defaultBucket);
  const [title, setTitle] = React.useState(editingTask?.Title || "");
  const [description, setDescription] = React.useState(editingTask?.Description || "");

  const [dueDate, setDueDate] = React.useState<Date | undefined>(
    editingTask?.DueDate ? new Date(editingTask.DueDate) : undefined
  );

  const [assignedTo, setAssignedTo] = React.useState(editingTask?.AssignedTo || "");

  const [priority, setPriority] = React.useState<"Low" | "Medium" | "High">(
    editingTask?.Priority || "Medium"
  );

  const [checklist, setChecklist] = React.useState<IChecklistItem[]>(
    editingTask?.Checklist || []
  );

  const [loading, setLoading] = React.useState(false);

  // ⭐ Autocomplete user search state
  const [userSuggestions, setUserSuggestions] = React.useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  /* ----------------------- CHECKLIST ----------------------- */
  const addChecklistItem = () => {
    setChecklist([...checklist, { text: "", done: false }]);
  };

  const updateChecklistText = (index: number, text: string) => {
    const updated = [...checklist];
    updated[index].text = text;
    setChecklist(updated);
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  /* ----------------------- SAVE TASK ----------------------- */
  const saveTask = async () => {
    if (!title.trim()) {
      alert("Please enter task title");
      return;
    }

    setLoading(true);
    const formattedDate = dueDate ? dueDate.toISOString() : "";

    try {
      if (isEdit) {
        await TaskService.updateTask(editingTask!.Id, {
          Title: title,
          Description: description,
          DueDate: formattedDate,
          AssignedTo: assignedTo,
          Priority: priority,
          Bucket: bucket,
        });

        await TaskService.updateChecklist(editingTask!.Id, checklist);
      } else {
        const created = await TaskService.createTask({
          Title: title,
          Description: description,
          DueDate: formattedDate,
          AssignedTo: assignedTo,
          Bucket: bucket,
          Priority: priority,
          Checklist: checklist,
        });

        await TaskService.updateChecklist(created.Id, checklist);
      }

      refreshTasks();
      onClose();

    } catch (err) {
      console.error("Save failed:", err);
      alert("Could not save task. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------- UI ----------------------- */
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.taskModalCard} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.cardHeader}>
          <h2>{isEdit ? "Edit Task" : "Add New Task"}</h2>
          <button className={styles.closeIcon} onClick={onClose}>✖</button>
        </div>

        <div className={styles.cardBody}>

          {/* Title */}
          <div className={styles.formGroup}>
            <label>Task Title</label>
            <input
              className={styles.inputField}
              value={title}
              placeholder="Enter task title"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              className={styles.textareaField}
              placeholder="Write details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Checklist */}
          <div className={styles.formGroup}>
            <label>Checklist</label>

            <div className={styles.checklistBox}>
              {checklist.length === 0 && (
                <p className={styles.emptyChecklist}>No items added yet</p>
              )}

              {checklist.map((item, index) => (
                <div key={index} className={styles.checklistRow}>
                  <input
                    type="text"
                    className={styles.checklistInput}
                    placeholder="Checklist item"
                    value={item.text}
                    onChange={(e) => updateChecklistText(index, e.target.value)}
                  />

                  <button
                    className={styles.removeChecklistBtn}
                    onClick={() => removeChecklistItem(index)}
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>

            <button className={styles.addChecklistBtn} onClick={addChecklistItem}>
              + Add Checklist Item
            </button>
          </div>

          {/* ---- DATE + ASSIGNED TO ---- */}
          <div className={styles.gridTwo}>

            {/* Date Picker */}
            <div className={styles.formGroup}>
              <label>Due Date</label>

              <DatePicker
                firstDayOfWeek={DayOfWeek.Monday}
                placeholder="Select a date..."
                ariaLabel="Select a date"
                value={dueDate}
                onSelectDate={(date) => setDueDate(date ?? undefined)}
                textField={{
                  className: styles.inputField,
                }}
                styles={{
                  root: { width: "100%" },
                  callout: { zIndex: 9999 },
                }}
              />
            </div>

            {/* Assigned To + Suggestions */}
            <div className={styles.formGroup} style={{ position: "relative" }}>
              <label>Assigned To</label>

              <input
                className={styles.inputField}
                value={assignedTo}
                placeholder="Enter user name..."
                onChange={async (e) => {
                  const value = e.target.value;
                  setAssignedTo(value);

                  if (value.length >= 2) {
                    const results = await TaskService.searchUsers(value);
                    setUserSuggestions(results);
                    setShowSuggestions(true);
                  } else {
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (userSuggestions.length > 0) setShowSuggestions(true);
                }}
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && userSuggestions.length > 0 && (
                <div className={styles.suggestionBox}>
                  {userSuggestions.map((u, index) => (
                    <div
                      key={index}
                      className={styles.suggestionItem}
                      onClick={() => {
                        setAssignedTo(u.email);
                        setShowSuggestions(false);
                      }}
                    >
                      <strong>{u.name}</strong>
                      <br />
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {u.email}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Priority */}
          <div className={styles.formGroup}>
            <label>Priority</label>
            <select
              className={styles.selectField}
              value={priority}
              onChange={(e) => setPriority(e.target.value as "Low" | "Medium" | "High")}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

        </div>

        {/* Footer */}
        <div className={styles.cardFooter}>
          <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button className={styles.saveButton} onClick={saveTask}>
            {loading ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default NewTaskForm;
