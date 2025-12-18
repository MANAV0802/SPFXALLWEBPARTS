import * as React from "react";
import type { ICrudoperationsProps } from "./ICrudoperationsProps";
import { getSp } from "../pnpConfig";

import {
  Checkbox,
  DetailsList,
  DetailsListLayoutMode,
  Dropdown,
  IColumn,
  IconButton,
  IDropdownOption,
  PrimaryButton,
  TextField,
} from "@fluentui/react";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface IEmployee {
  ID?: number;
  Title?: string;
  Departments?: string;
  Experience?: number;
  IsActive?: boolean;
}

interface ICrudoperationsState {
  employees: IEmployee[];
  successMessage: string;
  newEmployee?: IEmployee;
  departmentChoices: string[];
  editEmployeeId?: number;
  editedEmployee?: IEmployee;
}

export default class Crudoperations extends React.Component<
  ICrudoperationsProps,
  ICrudoperationsState
> {
  private sp = getSp();

  constructor(props: ICrudoperationsProps) {
    super(props);
    this.state = {
      employees: [],
      successMessage: "",
      departmentChoices: [],
    };
  }

  // ======================================
  // ENSURE LIST & COLUMNS
  // ======================================
  private ensureListExists = async (): Promise<void> => {
    const listName = "EmployeesSpfx";

    try {
      await this.sp.web.lists.getByTitle(listName)();
      console.log("List exists");
    } catch {
      console.log("List missing. Creating...");
      await this.sp.web.lists.add(listName, "Auto-created", 100);
      await new Promise((r) => setTimeout(r, 1500));
    }

    const fields = this.sp.web.lists.getByTitle(listName).fields;
    const existing = await fields.select("InternalName")();
    const names: string[] = existing.map((f: any) => f.InternalName);

    if (names.indexOf("Departments") === -1) {
      await fields.addChoice("Departments", {
        Choices: ["IT", "HR", "Finance", "Admin", "Sales"],
      });
    }

    if (names.indexOf("Experience") === -1) {
      await fields.addNumber("Experience", { MinimumValue: 0 });
    }

    if (names.indexOf("IsActive") === -1) {
      await fields.addBoolean("IsActive");
    }

    console.log("Columns ensured.");
  };

  // ======================================
  // LOAD DATA
  // ======================================
  public async componentDidMount(): Promise<void> {
    await this.ensureListExists();
    await this.loadDepartmentChoices();
    await this.loadEmployees();
  }

  private loadEmployees = async (): Promise<void> => {
    const items = await this.sp.web.lists
      .getByTitle("EmployeesSpfx")
      .items.select("ID", "Title", "Departments", "Experience", "IsActive")();

    this.setState({ employees: items });
  };

  private loadDepartmentChoices = async (): Promise<void> => {
    const field = await this.sp.web.lists
      .getByTitle("EmployeesSpfx")
      .fields.getByInternalNameOrTitle("Departments")();

    this.setState({
      departmentChoices: field.Choices ?? [],
    });
  };

  // ======================================
  // ADD NEW EMPLOYEE
  // ======================================
  private handleAddEmployee = () => {
    this.setState({
      newEmployee: {
        Title: "",
        Departments: "",
        Experience: 0,
        IsActive: true,
      },
      editedEmployee: undefined,
      editEmployeeId: undefined,
    });
  };

  private handleSaveNewEmployee = async (): Promise<void> => {
    const { newEmployee } = this.state;
    if (!newEmployee) return;

    if (!newEmployee.Title || !newEmployee.Departments) {
      toast.warn("Please enter Name and Department");
      return;
    }

    try {
      await this.sp.web.lists.getByTitle("EmployeesSpfx").items.add(newEmployee);
      toast.success("Employee added!");

      this.setState({ newEmployee: undefined });
      await this.loadEmployees();
    } catch (e) {
      toast.error("Failed to add employee");
    }
  };

  // ======================================
  // EDIT EMPLOYEE
  // ======================================
  private handleEditEmployee = (emp: IEmployee) => {
    this.setState({
      editEmployeeId: emp.ID,
      editedEmployee: { ...emp },
      newEmployee: undefined,
    });
  };

  // ======================================
  // UPDATE EMPLOYEE (FIXED VERSION)
  // ======================================
  private handleSaveEditedEmployee = async (): Promise<void> => {
    const emp = this.state.editedEmployee;

    if (!emp || !emp.ID) return;

    const { ID, Title, Departments, Experience, IsActive } = emp;

    const updateObj: any = {
      Title: Title || "",
      Departments: Departments || "",
      Experience: Experience ?? 0,
      IsActive: IsActive ?? false,
    };

    try {
      await this.sp.web.lists
        .getByTitle("EmployeesSpfx")
        .items.getById(ID)
        .update(updateObj);

      toast.success("Employee updated!");

      this.setState({
        editEmployeeId: undefined,
        editedEmployee: undefined,
      });

      await this.loadEmployees();
    } catch (e) {
      toast.error("Update failed");
    }
  };

  // ======================================
  // DELETE EMPLOYEE
  // ======================================
  private handleDeleteEmployee = async (id?: number) => {
    if (!id) return;
    if (!confirm("Are you sure?")) return;

    try {
      await this.sp.web.lists.getByTitle("EmployeesSpfx").items.getById(id).delete();
      toast.info("Employee deleted");
      await this.loadEmployees();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  // ======================================
  // COLUMNS
  // ======================================
  private getColumns(): IColumn[] {
    const { departmentChoices, newEmployee, editedEmployee, editEmployeeId } =
      this.state;

    const deptOptions: IDropdownOption[] = departmentChoices.map((c) => ({
      key: c,
      text: c,
    }));

    return [
      {
        key: "name",
        name: "Name",
        minWidth: 150,
        onRender: (item: IEmployee) => {
          if (!item.ID && newEmployee)
            return (
              <TextField
                value={newEmployee.Title}
                onChange={(_, v) =>
                  this.setState({
                    newEmployee: { ...newEmployee, Title: v || "" },
                  })
                }
              />
            );

          if (item.ID === editEmployeeId)
            return (
              <TextField
                value={editedEmployee?.Title || ""}
                onChange={(_, v) =>
                  this.setState({
                    editedEmployee: {
                      ...(editedEmployee || {}),
                      ID: item.ID,
                      Title: v || "",
                    },
                  })
                }
              />
            );

          return item.Title;
        },
      },

      {
        key: "dept",
        name: "Department",
        minWidth: 140,
        onRender: (item: IEmployee) => {
          if (!item.ID && newEmployee)
            return (
              <Dropdown
                options={deptOptions}
                selectedKey={newEmployee.Departments}
                onChange={(_, opt) =>
                  this.setState({
                    newEmployee: {
                      ...newEmployee,
                      Departments: opt?.key as string,
                    },
                  })
                }
              />
            );

          if (item.ID === editEmployeeId)
            return (
              <Dropdown
                options={deptOptions}
                selectedKey={editedEmployee?.Departments}
                onChange={(_, opt) =>
                  this.setState({
                    editedEmployee: {
                      ...(editedEmployee || {}),
                      ID: item.ID,
                      Departments: opt?.key as string,
                    },
                  })
                }
              />
            );

          return item.Departments;
        },
      },

      {
        key: "exp",
        name: "Experience",
        minWidth: 100,
        onRender: (item: IEmployee) => {
          if (!item.ID && newEmployee)
            return (
              <TextField
                type="number"
                value={(newEmployee.Experience ?? 0).toString()}
                onChange={(_, v) =>
                  this.setState({
                    newEmployee: {
                      ...newEmployee,
                      Experience: Number(v) || 0,
                    },
                  })
                }
              />
            );

          if (item.ID === editEmployeeId)
            return (
              <TextField
                type="number"
                value={(editedEmployee?.Experience ?? 0).toString()}
                onChange={(_, v) =>
                  this.setState({
                    editedEmployee: {
                      ...(editedEmployee || {}),
                      ID: item.ID,
                      Experience: Number(v) || 0,
                    },
                  })
                }
              />
            );

          return item.Experience;
        },
      },

      {
        key: "active",
        name: "Active",
        minWidth: 100,
        onRender: (item: IEmployee) => {
          if (!item.ID && newEmployee)
            return (
              <Checkbox
                checked={newEmployee.IsActive}
                onChange={(_, c) =>
                  this.setState({
                    newEmployee: { ...newEmployee, IsActive: !!c },
                  })
                }
              />
            );

          if (item.ID === editEmployeeId)
            return (
              <Checkbox
                checked={editedEmployee?.IsActive || false}
                onChange={(_, c) =>
                  this.setState({
                    editedEmployee: {
                      ...(editedEmployee || {}),
                      ID: item.ID,
                      IsActive: !!c,
                    },
                  })
                }
              />
            );

          return <Checkbox checked={item.IsActive} disabled />;
        },
      },

      {
        key: "actions",
        name: "Actions",
        minWidth: 180,
        onRender: (item: IEmployee) => {
          // New Row
          if (!item.ID && this.state.newEmployee)
            return (
              <>
                <PrimaryButton text="Save" onClick={this.handleSaveNewEmployee} />
                <PrimaryButton
                  text="Cancel"
                  style={{ marginLeft: 8 }}
                  onClick={() => this.setState({ newEmployee: undefined })}
                />
              </>
            );

          // Edit Mode
          if (item.ID === editEmployeeId)
            return (
              <>
                <PrimaryButton text="Update" onClick={this.handleSaveEditedEmployee} />
                <PrimaryButton
                  text="Cancel"
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    this.setState({ editEmployeeId: undefined, editedEmployee: undefined })
                  }
                />
              </>
            );

          // Normal Row
          return (
            <>
              <IconButton
                iconProps={{ iconName: "Edit" }}
                onClick={() => this.handleEditEmployee(item)}
              />
              <IconButton
                iconProps={{ iconName: "Delete" }}
                onClick={() => this.handleDeleteEmployee(item.ID)}
              />
            </>
          );
        },
      },
    ];
  }

  // ======================================
  // RENDER
  // ======================================
  public render() {
    const items = this.state.newEmployee
      ? [this.state.newEmployee, ...this.state.employees]
      : this.state.employees;

    return (
      <>
        <ToastContainer position="top-right" autoClose={2000} />

        <PrimaryButton
          text="Add Employee"
          onClick={this.handleAddEmployee}
          style={{ marginBottom: 12 }}
        />

        <DetailsList
          items={items}
          columns={this.getColumns()}
          layoutMode={DetailsListLayoutMode.fixedColumns}
        />
      </>
    );
  }
}
