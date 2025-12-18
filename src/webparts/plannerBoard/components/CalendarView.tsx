import * as React from "react";
import styles from "./PlannerBoard.module.scss";
import { IPlannerTask } from "../services/TaskService";

export interface ICalendarViewProps {
  tasks: IPlannerTask[];
  onTaskClick?: (task: IPlannerTask) => void;
}

const CalendarView: React.FC<ICalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const [showMonthPicker, setShowMonthPicker] = React.useState(false);
  const [pickerYear, setPickerYear] = React.useState(currentMonth.getFullYear());

  /* ------------------------------------------------
     OPEN PICKER (always works – even on Dec click)
  -------------------------------------------------- */
  const openMonthPicker = () => {
    setPickerYear(currentMonth.getFullYear());
    setShowMonthPicker(true);
  };

  /* ------------------------------------------------
     SELECT MONTH
  -------------------------------------------------- */
  const selectMonth = (monthIndex: number) => {
    setCurrentMonth(new Date(pickerYear, monthIndex, 1));
    setShowMonthPicker(false);
  };

  /* ------------------------------------------------
     NAVIGATE CALENDAR MONTHS
  -------------------------------------------------- */
  const goPrevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );

  const goNextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );

  /* Sync picker year when month changes */
  React.useEffect(() => {
    setPickerYear(currentMonth.getFullYear());
  }, [currentMonth]);

  /* ------------------------------------------------
     BUILD DAYS GRID
  -------------------------------------------------- */
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const firstDayIndex = (startOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = endOfMonth.getDate();

  const today = new Date();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7)
    weeks.push(cells.slice(i, i + 7));

  const getTasksForDate = (date: Date) =>
    tasks.filter((t) => t.DueDate && isSameDay(new Date(t.DueDate), date));

  /* ------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className={styles.calendarWrapper}>

      {/* HEADER */}
      <div className={styles.calendarHeader}>
        <button onClick={goPrevMonth} className={styles.calNavBtn}>‹</button>

        <span className={styles.calendarMonthLabel} onClick={openMonthPicker}>
          {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
        </span>

        <button onClick={goNextMonth} className={styles.calNavBtn}>›</button>
      </div>

      {/* ------------------------------------------------
         MONTH PICKER POPUP
      -------------------------------------------------- */}
      {showMonthPicker && (
        <div className={styles.monthPickerPopup}>

          {/* YEAR HEADER WITH < and > */}
          <div className={styles.yearRow}>
            <button onClick={() => setPickerYear(pickerYear - 1)} className={styles.yearBtn}>
              &lt;
            </button>

            <span className={styles.yearLabel}>{pickerYear}</span>

            <button onClick={() => setPickerYear(pickerYear + 1)} className={styles.yearBtn}>
              &gt;
            </button>
          </div>

          {/* MONTH GRID */}
          <div className={styles.monthGrid}>
            {[
              "Jan", "Feb", "Mar",
              "Apr", "May", "Jun",
              "Jul", "Aug", "Sep",
              "Oct", "Nov", "Dec"
            ].map((m, idx) => (
              <div
                key={idx}
                className={
                  idx === currentMonth.getMonth() &&
                  pickerYear === currentMonth.getFullYear()
                    ? `${styles.monthCell} ${styles.activeMonth}`
                    : styles.monthCell
                }
                onClick={() => selectMonth(idx)}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEEK LABELS */}
      <div className={styles.calendarWeekHeader}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className={styles.calendarWeekDay}>{d}</div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className={styles.calendarGrid}>
        {weeks.map((week, wi) => (
          <div key={wi} className={styles.calendarWeekRow}>
            {week.map((date, di) => {
              if (!date)
                return (
                  <div
                    key={di}
                    className={`${styles.calendarCell} ${styles.calendarEmpty}`}
                  />
                );

              const isTodayDate = isSameDay(date, today);
              const dayTasks = getTasksForDate(date);

              return (
                <div
                  key={di}
                  className={`${styles.calendarCell} ${isTodayDate ? styles.calendarToday : ""}`}
                >
                  <div className={styles.calendarDateNumber}>{date.getDate()}</div>

                  <div className={styles.calendarTasks}>
                    {dayTasks.map((t) => {
                      const p =
                        t.Priority === "High"
                          ? styles.highChip
                          : t.Priority === "Medium"
                          ? styles.mediumChip
                          : styles.lowChip;

                      return (
                        <button
                          key={t.Id}
                          className={`${styles.calendarTaskChip} ${p}`}
                          onClick={() => onTaskClick && onTaskClick(t)}
                        >
                          {t.Title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
};

export default CalendarView;
