import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import HrAssistantAiwp from './components/HrAssistantAiwp';
import * as strings from 'HrAssistantAiwpWebPartStrings';

export interface IHrAssistantAiwpWebPartProps {}

export default class HrAssistantAiwpWebPart
  extends BaseClientSideWebPart<IHrAssistantAiwpWebPartProps> {

  public render(): void {
    const element = React.createElement(
      HrAssistantAiwp,   // ⬅ No props passed
      {}
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  // ❌ No property pane fields because we are not using description anymore
  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: strings.PropertyPaneDescription },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: []
            }
          ]
        }
      ]
    };
  }
}
