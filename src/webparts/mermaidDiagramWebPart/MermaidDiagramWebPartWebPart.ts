import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import mermaid from "mermaid";


export interface IMermaidDiagramWebPartProps {
  mermaidText: string;
}

export default class MermaidDiagramWebPart extends BaseClientSideWebPart<IMermaidDiagramWebPartProps> {

public async onInit(): Promise<void> {
  await super.onInit();

  console.log('Mermaid version in SPFx bundle:', (mermaid as any).version);

  mermaid.initialize({
    startOnLoad: false
  });
}



  public render(): void {
    const graphId = `mermaid-graph-${this.instanceId}`;

    this.domElement.innerHTML = `
      <div>
        <div id="${graphId}" style="min-height:300px; border:1px dashed #ddd; padding:10px;"></div>
      </div>
    `;

    const graphDefinition = this.properties.mermaidText || "graph LR; A-->B;";

    setTimeout(() => {
      this.renderMermaidDiagram(graphDefinition, graphId);
    }, 100);
  }

 private async renderMermaidDiagram(graphDefinition: string, graphId: string): Promise<void> {
  try {
    const element = this.domElement.querySelector(`#${graphId}`) as HTMLElement;
    if (!element) return;

    const { svg, bindFunctions } = await mermaid.render(`id-${graphId}`, graphDefinition);

    element.innerHTML = svg;

    if (bindFunctions) {
      bindFunctions(element);
    }
  } catch (error: any) {
    console.error("Mermaid rendering failed:", error);

    const element = this.domElement.querySelector(`#${graphId}`) as HTMLElement;
    if (element) {
      element.innerHTML = `
        <p style="color:red; font-weight:bold;">
          ⚠ Invalid Mermaid Code<br/>
          <small>${error?.message ?? error}</small>
        </p>
      `;
    }
  }
}




  protected onPropertyPaneFieldChanged(): void {
    this.render();
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: "Enter Mermaid Chart Code" },
          groups: [
            {
              groupName: "Diagram Source",
              groupFields: [
                PropertyPaneTextField('mermaidText', {
                  label: "Mermaid Code",
                  multiline: true
                })
              ]
            }
          ]
        }
      ]
    };
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
