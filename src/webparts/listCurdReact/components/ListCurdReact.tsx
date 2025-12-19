import * as React from "react";
import styles from "./ListCurdReact.module.scss";
import type { IListCrudReactProps } from "./IListCurdReactProps";

interface IState {
  items: any[];

  EmployeeID: string;
  EmployeeName: string;
  EmailAddress: string;
  Manager: string;
  Gender: string;
  HireDate: string;
  Department: string;
  IsActive: boolean;
  MobileNumber: string;
  JobDescription: string;

  // profile photo
  ProfilePhoto: string; // final URL to store
  photoMode: "url" | "upload";
  uploadFile: File | null;
  uploadProgress: number;
  previewUrl: string | null;

  UpdateId: number | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Assumptions:
 * - List name: EmployeeDetails
 * - Document library for photos: EmployeePhotos (server-relative: /EmployeePhotos)
 * - List columns internal names:
 *   Title (Employee name), JobDescription, HireDate, Department, IsActive,
 *   MobileNumber, EmployeeID, EmailAddress, Manager, Gender, ProfilePhoto (Hyperlink or Picture)
 */
export default class ListCrudReact extends React.Component<
  IListCrudReactProps,
  IState
> {
  constructor(props: IListCrudReactProps) {
    super(props);

    this.state = {
      items: [],

      EmployeeID: "",
      EmployeeName: "",
      EmailAddress: "",
      Manager: "",
      Gender: "",
      HireDate: "",
      Department: "",
      IsActive: false,
      MobileNumber: "",
      JobDescription: "",

      ProfilePhoto: "",
      photoMode: "url",
      uploadFile: null,
      uploadProgress: 0,
      previewUrl: null,

      UpdateId: null,
      isLoading: false,
      error: null,
    };
  }

  // -------------------- lifecycle --------------------

  public componentDidMount(): void {
    this.getItems();
  }

  // -------------------- helpers --------------------

  private formatDate = (value: string | null | undefined): string => {
    if (!value) return "";
    return value.split("T")[0];
  };

  private resetForm = (): void => {
    this.setState({
      EmployeeID: "",
      EmployeeName: "",
      EmailAddress: "",
      Manager: "",
      Gender: "",
      HireDate: "",
      Department: "",
      IsActive: false,
      MobileNumber: "",
      JobDescription: "",

      ProfilePhoto: "",
      photoMode: "url",
      uploadFile: null,
      uploadProgress: 0,
      previewUrl: null,

      UpdateId: null,
      error: null,
    });
  };

  // -------------------- CRUD: READ --------------------

  private getItems = async (): Promise<void> => {
    this.setState({ isLoading: true, error: null });

    try {
      // no select() so we don't crash if some columns are missing
      const result = await this.props.sp.web.lists
        .getByTitle("EmployeeDetails")
        .items();

      this.setState({ items: result, isLoading: false });
    } catch (err: any) {
      console.error("[getItems] Error:", err);
      this.setState({
        isLoading: false,
        error:
          "Failed to load employees. Check list name & permissions (see console).",
      });
    }
  };

  // -------------------- upload helper --------------------

  /**
   * Uploads a file to /EmployeePhotos (fallback /SiteAssets) and returns the absolute URL
   */
  /**
 * Robust upload helper — tries multiple PnP shapes and will create the library folder
 * if needed. Uploads file to preferredLib (e.g. "/EmployeePhotos") or falls back to "/SiteAssets".
 */
private uploadPhotoFile = async (file: File): Promise<string> => {
  const preferredLib = "/EmployeePhotos";
  const fallbackLib = "/SiteAssets";

  const buffer = await file.arrayBuffer();
  const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

  // cast to any to avoid TS shape issues — we'll check for methods at runtime
  const webAny: any = (this.props.sp && (this.props.sp as any).web) ? (this.props.sp as any).web : (this.props.sp as any);

  const tryUploadTo = async (libServerRelative: string): Promise<string> => {
    const libName = libServerRelative.replace(/^\//, "");

    // helper to resolve folder object one of several ways
    const resolveFolder = async (): Promise<any> => {
      // 1) getFolderByServerRelativeUrl
      if (typeof webAny.getFolderByServerRelativeUrl === "function") {
        try {
          return webAny.getFolderByServerRelativeUrl(libServerRelative);
        } catch (e) {
          // continue to other attempts
        }
      }

      // 2) getFolderByServerRelativePath (pnp v3 alternative)
      if (typeof webAny.getFolderByServerRelativePath === "function") {
        try {
          return webAny.getFolderByServerRelativePath(libServerRelative);
        } catch (e) {}
      }

      // 3) If web.folders.add exists, try to create the library folder (useful if library missing)
      if (webAny.folders && typeof webAny.folders.add === "function") {
        try {
          // try to create the library/folder if it doesn't exist
          await webAny.folders.add(libName);
          // after creation, try to get it by server relative url
          if (typeof webAny.getFolderByServerRelativeUrl === "function") {
            return webAny.getFolderByServerRelativeUrl(libServerRelative);
          }
        } catch (e) {
          // ignore and continue
          console.warn("[uploadPhotoFile] folders.add attempt failed:", e);
        }
      }
      // 4) As last resort, return null to indicate we couldn't resolve a folder object
      return null;
    };
    const folder = await resolveFolder();
    if (!folder) {
      throw new Error(
        `Could not resolve folder object for '${libServerRelative}'. The PnP shape on this environment doesn't expose folder APIs.`
      );
    }
    // at this point 'folder' should have a files.add method; try uploading
    try {
      const addResult = await (folder as any).files.add(safeName, buffer, true);
      const data: any = (addResult && (addResult as any).data) || addResult;
      const serverRelativeUrl =
        data?.ServerRelativeUrl || data?.serverRelativeUrl || `${libServerRelative}/${safeName}`;
      const absoluteUrl = `${window.location.origin}${serverRelativeUrl}`;
      console.log(`[uploadPhotoFile] uploaded to ${libServerRelative} -> ${absoluteUrl}`);
      return absoluteUrl;
    } catch (uploadErr) {
      console.warn(`[uploadPhotoFile] upload to ${libServerRelative} failed:`, uploadErr);
      throw uploadErr;
    }
  };
 
  // Try preferred library first, then fallback
  try {
    return await tryUploadTo(preferredLib);
  } catch (err1) {
    console.warn("[uploadPhotoFile] preferred upload failed, trying fallback", err1);
    try {
      return await tryUploadTo(fallbackLib);
    } catch (err2) {
      console.error("[uploadPhotoFile] both uploads failed:", err2);
      throw err2;
    }
  }
};


  // -------------------- payload helper --------------------

  private buildPayloadCandidates = async (): Promise<{
    urlPayload: any;
    urlStringPayload: any;
  }> => {
    let photoUrl = this.state.ProfilePhoto || "";

    if (this.state.photoMode === "upload" && this.state.uploadFile) {
      this.setState({ uploadProgress: 10 });
      photoUrl = await this.uploadPhotoFile(this.state.uploadFile);
      this.setState({ uploadProgress: 100, previewUrl: photoUrl });
    }

    // Common fields (update keys if your internal names differ)
    const common: any = {
      Title: this.state.EmployeeName || null,
      JobDescription: this.state.JobDescription || null,
      HireDate: this.state.HireDate
        ? `${this.state.HireDate}T00:00:00Z`
        : null,
      Department: this.state.Department || null,
      IsActive: this.state.IsActive,
      MobileNumber: this.state.MobileNumber
        ? Number(this.state.MobileNumber)
        : null,
      EmployeeID: this.state.EmployeeID || null,
      EmailAddress: this.state.EmailAddress || null,
      Manager: this.state.Manager || null,
      Gender: this.state.Gender || null,
    };

    // Candidate A: Hyperlink/Picture object
    const urlPayload: any = {
      ...common,
      ProfilePhoto: photoUrl
        ? {
            Url: photoUrl,
            Description: this.state.EmployeeName || "Profile Photo",
          }
        : null,
    };

    // Candidate B: plain string
    const urlStringPayload: any = {
      ...common,
      ProfilePhoto: photoUrl || null,
    };

    console.log("[buildPayloadCandidates] urlPayload:", urlPayload);
    console.log("[buildPayloadCandidates] urlStringPayload:", urlStringPayload);

    return { urlPayload, urlStringPayload };
  };

  // -------------------- CREATE --------------------

  private createItem = async (): Promise<void> => {
    this.setState({ error: null, uploadProgress: 0 });

    try {
      const { urlPayload, urlStringPayload } =
        await this.buildPayloadCandidates();

      try {
        console.log("[createItem] trying object payload");
        await this.props.sp.web.lists
          .getByTitle("EmployeeDetails")
          .items.add(urlPayload);
        this.resetForm();
        await this.getItems();
        return;
      } catch (errObj) {
        console.warn(
          "[createItem] object payload failed, will retry with string payload",
          errObj
        );
      }

      try {
        console.log("[createItem] trying string payload");
        await this.props.sp.web.lists
          .getByTitle("EmployeeDetails")
          .items.add(urlStringPayload);
        this.resetForm();
        await this.getItems();
        return;
      } catch (errStr) {
        console.error("[createItem] string payload also failed", errStr);
        const msg = (errStr && errStr.message) || JSON.stringify(errStr);
        alert("Create failed: " + msg);
        this.setState({
          error: "Failed to create employee. See console for details.",
        });
      }
    } catch (err: any) {
      console.error("[createItem] fatal error:", err);
      alert("Create fatal error: " + (err.message || JSON.stringify(err)));
      this.setState({
        error: "Failed to create employee (upload/prepare error).",
      });
    }
  };

  // -------------------- UPDATE --------------------

  private updateItem = async (): Promise<void> => {
    if (!this.state.UpdateId) return;
    this.setState({ error: null, uploadProgress: 0 });

    try {
      const { urlPayload, urlStringPayload } =
        await this.buildPayloadCandidates();

      try {
        console.log("[updateItem] trying object payload");
        await this.props.sp.web.lists
          .getByTitle("EmployeeDetails")
          .items.getById(this.state.UpdateId)
          .update(urlPayload);
        this.resetForm();
        await this.getItems();
        return;
      } catch (errObj) {
        console.warn(
          "[updateItem] object payload failed, will retry with string payload",
          errObj
        );
      }

      try {
        console.log("[updateItem] trying string payload");
        await this.props.sp.web.lists
          .getByTitle("EmployeeDetails")
          .items.getById(this.state.UpdateId)
          .update(urlStringPayload);
        this.resetForm();
        await this.getItems();
        return;
      } catch (errStr) {
        console.error("[updateItem] string payload also failed", errStr);
        const msg = (errStr && errStr.message) || JSON.stringify(errStr);
        alert("Update failed: " + msg);
        this.setState({
          error: "Failed to update employee. See console for details.",
        });
      }
    } catch (err: any) {
      console.error("[updateItem] fatal error:", err);
      alert("Update fatal error: " + (err.message || JSON.stringify(err)));
      this.setState({
        error: "Failed to update employee (upload/prepare error).",
      });
    }
  };

  // -------------------- EDIT & DELETE --------------------

  private editItem = (item: any): void => {
    console.log("[editItem] item:", item);

    let photoUrl = "";
    if (item.ProfilePhoto) {
      photoUrl =
        item.ProfilePhoto.Url ||
        item.ProfilePhoto.url ||
        item.ProfilePhoto ||
        "";
    }

    this.setState({
      UpdateId: item.Id,

      EmployeeID: item.EmployeeID || "",
      EmployeeName: item.Title || "",
      EmailAddress: item.EmailAddress || "",
      Manager: item.Manager || "",
      Gender: item.Gender || "",
      HireDate: this.formatDate(item.HireDate),
      Department: item.Department || "",
      IsActive: item.IsActive === true,
      MobileNumber:
        item.MobileNumber !== undefined && item.MobileNumber !== null
          ? String(item.MobileNumber)
          : "",
      JobDescription: item.JobDescription || "",

      ProfilePhoto: photoUrl,
      photoMode: "url",
      previewUrl: photoUrl || null,
      uploadFile: null,
      uploadProgress: 0,
      error: null,
    });
  };

  private deleteItem = async (id: number): Promise<void> => {
    const proceed = window.confirm(
      "Are you sure you want to delete this employee?"
    );
    if (!proceed) return;

    try {
      await this.props.sp.web.lists
        .getByTitle("EmployeeDetails")
        .items.getById(id)
        .delete();

      if (this.state.UpdateId === id) this.resetForm();
      await this.getItems();
    } catch (err: any) {
      console.error("[deleteItem] Error:", err);
      this.setState({
        error:
          "Failed to delete employee. Check console for details (permissions).",
      });
    }
  };

  // -------------------- photo input handlers --------------------

  private onPhotoFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const previewUrl = URL.createObjectURL(file);

    this.setState({
      uploadFile: file,
      previewUrl,
      photoMode: "upload",
      uploadProgress: 0,
    });
  };

  private onPhotoModeChange = (mode: "url" | "upload"): void => {
    this.setState({ photoMode: mode });
  };

  private onProfileUrlChange = (value: string): void => {
    this.setState({
      ProfilePhoto: value,
      previewUrl: value || null,
      photoMode: "url",
    });
  };

  // -------------------- render --------------------

  public render(): React.ReactElement<IListCrudReactProps> {
    const {
      items,
      isLoading,
      error,
      photoMode,
      previewUrl,
      uploadProgress,
    } = this.state;

    return (
      <section className={styles.listCrudReact}>
        <h2>Employee Details</h2>

        {/* FORM */}
        <div className={styles.formContainer}>
          {/* Employee ID */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Employee ID</label>
            <div className={styles.formField}>
              <input
                type="text"
                value={this.state.EmployeeID}
                onChange={(e) =>
                  this.setState({ EmployeeID: e.target.value })
                }
                placeholder="e.g. EMP001"
              />
            </div>
          </div>

          {/* Name */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Employee Name</label>
            <div className={styles.formField}>
              <input
                type="text"
                value={this.state.EmployeeName}
                onChange={(e) =>
                  this.setState({ EmployeeName: e.target.value })
                }
              />
            </div>
          </div>

          {/* Email */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Email Address</label>
            <div className={styles.formField}>
              <input
                type="email"
                value={this.state.EmailAddress}
                onChange={(e) =>
                  this.setState({ EmailAddress: e.target.value })
                }
                placeholder="name@example.com"
              />
            </div>
          </div>

          {/* Manager */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Manager</label>
            <div className={styles.formField}>
              <input
                type="text"
                value={this.state.Manager}
                onChange={(e) =>
                  this.setState({ Manager: e.target.value })
                }
                placeholder="Manager name"
              />
            </div>
          </div>

          {/* Gender */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Gender</label>
            <div className={styles.formField}>
              <select
                value={this.state.Gender}
                onChange={(e) =>
                  this.setState({ Gender: e.target.value })
                }
              >
                <option value="">-- Select Gender --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Hire Date */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Hire Date</label>
            <div className={styles.formField}>
              <input
                type="date"
                value={this.state.HireDate}
                onChange={(e) =>
                  this.setState({ HireDate: e.target.value })
                }
              />
            </div>
          </div>

          {/* Department */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Department</label>
            <div className={styles.formField}>
              <select
                value={this.state.Department}
                onChange={(e) =>
                  this.setState({ Department: e.target.value })
                }
              >
                <option value="">-- Select Department --</option>
                <option value="Tech">Tech</option>
                <option value="BDE">BDE</option>
                <option value="HR">HR</option>
              </select>
            </div>
          </div>

          {/* Is Active */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Is Active</label>
            <div className={styles.formField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={this.state.IsActive}
                  onChange={(e) =>
                    this.setState({ IsActive: e.target.checked })
                  }
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          {/* Mobile */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Mobile Number</label>
            <div className={styles.formField}>
              <input
                type="tel"
                value={this.state.MobileNumber}
                onChange={(e) =>
                  this.setState({ MobileNumber: e.target.value })
                }
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          {/* Job Description */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Job Description</label>
            <div className={styles.formField}>
              <textarea
                value={this.state.JobDescription}
                onChange={(e) =>
                  this.setState({ JobDescription: e.target.value })
                }
              />
            </div>
          </div>

          {/* Profile Photo: URL or Upload */}
          <div className={styles.formRow}>
            <label className={styles.formLabel}>Profile Photo</label>
            <div className={styles.formField}>
              <div className={styles.photoModeRow}>
                <label>
                  <input
                    type="radio"
                    name="photoMode"
                    checked={photoMode === "url"}
                    onChange={() => this.onPhotoModeChange("url")}
                  />{" "}
                  Paste URL
                </label>
                <label>
                  <input
                    type="radio"
                    name="photoMode"
                    checked={photoMode === "upload"}
                    onChange={() => this.onPhotoModeChange("upload")}
                  />{" "}
                  Upload File
                </label>
              </div>

              {photoMode === "url" ? (
                <div className={styles.urlInputRow}>
                  <input
                    type="text"
                    value={this.state.ProfilePhoto}
                    onChange={(e) =>
                      this.onProfileUrlChange(e.target.value)
                    }
                    placeholder="https://.../photo.jpg"
                  />
                </div>
              ) : (
                <div className={styles.uploadRow}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={this.onPhotoFileChange}
                  />
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {previewUrl && (
                <div className={styles.previewWrap}>
                  <img
                    src={previewUrl}
                    alt="preview"
                    className={styles.previewImage}
                  />
                </div>
              )}
            </div>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.formButton}>
            {this.state.UpdateId ? (
              <button onClick={this.updateItem}>Update Employee</button>
            ) : (
              <button onClick={this.createItem}>Add New Employee</button>
            )}
          </div>
        </div>

        {/* EMPLOYEE CARDS */}
        <section className={styles.employeesSection}>
          <div className={styles.employeesHeader}>
            <h3>Employees</h3>
            <span className={styles.employeeCount}>
              {isLoading
                ? "Loading..."
                : `${items.length} employee${
                    items.length === 1 ? "" : "s"
                  }`}
            </span>
          </div>

          {items.length === 0 && !isLoading ? (
            <p className={styles.emptyState}>
              No employees found. Add your first employee using the form
              above.
            </p>
          ) : (
            <div className={styles.employeesGrid}>
              {items.map((item: any) => {
                const profileUrl =
                  (item.ProfilePhoto &&
                    (item.ProfilePhoto.Url ||
                      item.ProfilePhoto.url ||
                      item.ProfilePhoto)) ||
                  "";

                return (
                  <div key={item.Id} className={styles.employeeCard}>
                    <div className={styles.employeeTop}>
                      {profileUrl ? (
                        <img
                          src={profileUrl}
                          alt={item.Title}
                          className={styles.profilePhoto}
                        />
                      ) : (
                        <div className={styles.profilePhotoPlaceholder}>
                          {item.Title
                            ? item.Title.charAt(0).toUpperCase()
                            : "?"}
                        </div>
                      )}

                      <div className={styles.employeeTitleBlock}>
                        <div className={styles.employeeName}>
                          {item.Title || "-"}
                        </div>
                        <div className={styles.employeeSubLine}>
                          {item.EmployeeID && (
                            <span className={styles.employeeId}>
                              ID: {item.EmployeeID}
                            </span>
                          )}
                          {item.Department && (
                            <span className={styles.dotSeparator}>
                              • {item.Department}
                            </span>
                          )}
                        </div>
                        {item.Manager && (
                          <div className={styles.employeeManager}>
                            Manager: {item.Manager}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.employeeMeta}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Email</span>
                        <span className={styles.metaValue}>
                          {item.EmailAddress || "-"}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Mobile</span>
                        <span className={styles.metaValue}>
                          {item.MobileNumber || "-"}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Hire date</span>
                        <span className={styles.metaValue}>
                          {this.formatDate(item.HireDate) || "-"}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Gender</span>
                        <span className={styles.metaValue}>
                          {item.Gender || "-"}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Status</span>
                        <span
                          className={
                            item.IsActive
                              ? styles.badgeActive
                              : styles.badgeInactive
                          }
                        >
                          {item.IsActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    {item.JobDescription && (
                      <div className={styles.employeeDescription}>
                        {item.JobDescription}
                      </div>
                    )}

                    <div className={styles.employeeActions}>
                      <button
                        className={`${styles.cardButton} ${styles.edit}`}
                        onClick={() => this.editItem(item)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.cardButton} ${styles.delete}`}
                        onClick={() => this.deleteItem(item.Id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
    );
  }
}
