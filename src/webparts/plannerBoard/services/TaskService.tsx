import { SPFI } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

// EnsureUser()
import "@pnp/sp/site-users/web";

// sendEmail()
import "@pnp/sp/sputilities";

/* ---------------------- INTERFACES ---------------------- */
export interface IChecklistItem {
  text: string;
  done: boolean;
}

export interface ITaskActivity {
  Id?: number;
  Title: string;
  TaskId: number;
  Action: string;
  OldBucket?: string;
  NewBucket?: string;
  Timestamp: string;
}

export interface IPlannerTask {
  Id: number;
  Title: string;
  Description?: string;
  DueDate?: string;
  Status?: string;
  Bucket: string;
  Priority?: "Low" | "Medium" | "High";
  AssignedTo?: string; // email
  Checklist: IChecklistItem[];
}

export default class TaskService {
  private static _sp: SPFI;

  public static init(sp: SPFI): void {
    this._sp = sp;
  }

  /* ---------------------- GET TASKS ---------------------- */
  public static async getTasks(): Promise<IPlannerTask[]> {
    const items: any[] = await this._sp.web.lists
      .getByTitle("TaskManager")
      .items.select(
        "Id",
        "Title",
        "Description",
        "DueDate",
        "Status",
        "Bucket",
        "Priority",
        "Checklist",
        "AssignedTo/Title",
        "AssignedTo/EMail"
      )
      .expand("AssignedTo")();

    return items.map((i) => ({
      Id: i.Id,
      Title: i.Title,
      Description: i.Description || "",
      DueDate: i.DueDate || "",
      Status: i.Status || "New",
      Bucket: i.Bucket || "Backlog",
      Priority: i.Priority || "Medium",
      AssignedTo: i.AssignedTo?.EMail || "",
      Checklist: (() => {
        try {
          return i.Checklist ? JSON.parse(i.Checklist) : [];
        } catch {
          return [];
        }
      })()
    }));
  }

  /* ---------------------- CREATE TASK ---------------------- */
  public static async createTask(task: Partial<IPlannerTask>): Promise<IPlannerTask> {
    // use indexOf instead of includes → no TS lib issue
    const hasEmail =
      task.AssignedTo && task.AssignedTo.indexOf("@") > -1;

    const userId = hasEmail ? await this.getUserId(task.AssignedTo!) : null;

    // build payload safely, only set AssignedToId when we have a userId
    const itemPayload: any = {
      Title: task.Title,
      Description: task.Description || "",
      DueDate: task.DueDate ? task.DueDate : undefined,
      Status: task.Status || "New",
      Bucket: task.Bucket || "Backlog",
      Priority: task.Priority || "Medium",
      Checklist: JSON.stringify(task.Checklist || [])
    };

    if (userId) {
      itemPayload.AssignedToId = userId;
    }

    const added = await this._sp.web.lists.getByTitle("TaskManager").items.add(
      itemPayload
    );

    await this.logActivity({
      Title: "Task Created",
      TaskId: added.data.Id,
      Action: "Create",
      NewBucket: task.Bucket || "Backlog",
      Timestamp: new Date().toISOString()
    });

    if (hasEmail) {
      await this.sendEmailNotification(task.AssignedTo!, task.Title!);
    }

    return {
      Id: added.data.Id,
      Title: task.Title!,
      Description: task.Description || "",
      DueDate: task.DueDate || "",
      AssignedTo: task.AssignedTo || "",
      Bucket: task.Bucket || "Backlog",
      Priority: task.Priority || "Medium",
      Checklist: task.Checklist || []
    };
  }

  /* ---------------------- UPDATE TASK ---------------------- */
  public static async updateTask(
    id: number,
    task: Partial<IPlannerTask>
  ): Promise<void> {
    const hasEmail =
      task.AssignedTo && task.AssignedTo.indexOf("@") > -1;

    const userId = hasEmail ? await this.getUserId(task.AssignedTo!) : null;

    const updatePayload: any = {
      Title: task.Title,
      Description: task.Description,
      DueDate: task.DueDate ? task.DueDate : undefined,
      Status: task.Status,
      Bucket: task.Bucket,
      Priority: task.Priority,
      Checklist: task.Checklist ? JSON.stringify(task.Checklist) : undefined
    };

    if (userId) {
      updatePayload.AssignedToId = userId;
    } else {
      // if nothing selected, clear the person field
      updatePayload.AssignedToId = null;
    }

    await this._sp.web.lists
      .getByTitle("TaskManager")
      .items.getById(id)
      .update(updatePayload);

    await this.logActivity({
      Title: "Task Updated",
      TaskId: id,
      Action: "Update",
      Timestamp: new Date().toISOString()
    });

    if (hasEmail) {
      await this.sendEmailNotification(
        task.AssignedTo!,
        task.Title || "Task Updated"
      );
    }
  }

  /* ---------------------- UPDATE CHECKLIST ---------------------- */
  public static async updateChecklist(id: number, checklist: IChecklistItem[]) {
    await this._sp.web.lists
      .getByTitle("TaskManager")
      .items.getById(id)
      .update({ Checklist: JSON.stringify(checklist) });

    await this.logActivity({
      Title: "Checklist Updated",
      TaskId: id,
      Action: "Checklist",
      Timestamp: new Date().toISOString()
    });
  }

  /* ---------------------- MOVE TASK ---------------------- */
  public static async updateTaskBucket(
    id: number,
    newBucket: string
  ): Promise<void> {
    const old = await this._sp.web.lists
      .getByTitle("TaskManager")
      .items.getById(id)
      .select("Bucket")();

    await this._sp.web.lists
      .getByTitle("TaskManager")
      .items.getById(id)
      .update({ Bucket: newBucket });

    await this.logActivity({
      Title: "Task Moved",
      TaskId: id,
      Action: "Move",
      OldBucket: old.Bucket,
      NewBucket: newBucket,
      Timestamp: new Date().toISOString()
    });
  }

  /* ---------------------- DELETE TASK ---------------------- */
  public static async deleteTask(id: number): Promise<void> {
    await this._sp.web.lists.getByTitle("TaskManager").items.getById(id).delete();

    await this.logActivity({
      Title: "Task Deleted",
      TaskId: id,
      Action: "Delete",
      Timestamp: new Date().toISOString()
    });
  }

  /* ---------------------- LOG ACTIVITY ---------------------- */
  private static async logActivity(activity: ITaskActivity): Promise<void> {
    await this._sp.web.lists.getByTitle("TaskActivity").items.add(activity);
  }

  /* ---------------------- GET USER ID ---------------------- */
  private static async getUserId(email: string): Promise<number | null> {
    try {
      const user = await this._sp.web.ensureUser(email);
      // `ensureUser` can return an object with a `data` property (e.g. AddResult-like)
      // or the user info directly. Handle both shapes safely.
      const u: any = user;
      return u?.data?.Id ?? u?.Id ?? null;
    } catch (err) {
      console.error("ensureUser failed:", email, err);
      return null;
    }
  }

  /* ---------------------- SEND EMAIL ---------------------- */
  private static async sendEmailNotification(
    email: string,
    taskTitle: string
  ) {
    try {
      await this._sp.utility.sendEmail({
        To: [email],
        Subject: `New Task Assigned: ${taskTitle}`,
        Body: `
          <p>Hello,</p>
          <p>You have been assigned a new task:</p>
          <p><b>${taskTitle}</b></p>
          <p>Please open the Planner Dashboard.</p>
        `
      });
    } catch (error) {
      console.error("Email send failed:", error);
    }
  }

  /* ---------------------- USER SEARCH (autocomplete) ---------------------- */
  public static async searchUsers(query: string): Promise<any[]> {
    if (!query || query.length < 2) return [];

    try {
      const users = await this._sp.web.siteUsers
        .filter(
          `substringof('${query}', Email) or substringof('${query}', Title)`
        )();

      return users.map((u: any) => ({
        name: u.Title,
        email: u.Email
      }));
    } catch (err) {
      console.error("User search failed:", err);
      return [];
    }
  }

  /* ---------------------- GET ACTIVITY LOG ---------------------- */
  public static async getActivityLog(
    taskId: number
  ): Promise<ITaskActivity[]> {
    return await this._sp.web.lists
      .getByTitle("TaskActivity")
      .items.select(
        "Id",
        "Title",
        "Action",
        "OldBucket",
        "NewBucket",
        "Timestamp"
      )
      .filter(`TaskId eq ${taskId}`)
      .orderBy("Timestamp", false)();
  }
}
