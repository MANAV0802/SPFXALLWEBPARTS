import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';

import styles from './AddFolderAndSubFolderToDocumentLibraryWebPart.module.scss';
// import * as strings from 'AddFolderAndSubFolderToDocumentLibraryWebPartStrings';
import * as strings from 'AddFolderAndSubFolderToDocumentLibraryWebPartStrings';



import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/folders";

export interface IAddFolderAndSubFolderToDocumentLibraryWebPartProps {
  description: string;
}

export default class AddFolderAndSubFolderToDocumentLibraryWebPart extends BaseClientSideWebPart<IAddFolderAndSubFolderToDocumentLibraryWebPartProps> {

  private sp: ReturnType<typeof spfi>;



public render(): void {
  this.domElement.innerHTML = `
  <section class="${styles.addFolderAndSubFolderToDocumentLibrary}">
    <div>

      <h3>Create Folder & Subfolders</h3>

      <label>Main Folder Name:</label><br>
      <input type="text" id="mainFolderInput" placeholder="e.g. Project A" />
      <br><br>

      <label>Subfolders (comma-separated):</label><br>
      <input type="text" id="subFolderInput" placeholder="e.g. Design, Development, Testing" />
      <br><br>

      <button id="createUserFoldersBtn">Create Folder Structure</button>

    </div>
  </section>`;

  document.getElementById("createUserFoldersBtn")
    ?.addEventListener("click", () => this.createUserFoldersWithSubfolders());
}


  private async createUserFoldersWithSubfolders(): Promise<void> {

  const mainFolder = (document.getElementById("mainFolderInput") as HTMLInputElement).value.trim();
  const subFolderInput = (document.getElementById("subFolderInput") as HTMLInputElement).value.trim();

  if (!mainFolder) {
    alert("Please enter main folder name!");
    return;
  }

  const libraryName = "Employee Approved Claims";

  try {

    const mainFolderPath = `${libraryName}/${mainFolder}`;
    await this.sp.web.folders.addUsingPath(mainFolderPath);
    console.log("Main folder created:", mainFolderPath);

    if (subFolderInput) {
      const subFolders = subFolderInput.split(",").map(f => f.trim());

      for (const sub of subFolders) {
        const subPath = `${mainFolderPath}/${sub}`;
        console.log("Creating subfolder:", subPath);
        await this.sp.web.folders.addUsingPath(subPath);
      }
    }

    alert("Folders created successfully!");

    (document.getElementById("mainFolderInput") as HTMLInputElement).value = "";
    (document.getElementById("subFolderInput") as HTMLInputElement).value = "";

  } catch (error) {
    console.error("Error creating folders:", error);
    alert("Error while creating folders. Check console!");
  }
}


    protected async onInit(): Promise<void> {
    this.sp = spfi().using(SPFx(this.context));
  }



  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }


    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
