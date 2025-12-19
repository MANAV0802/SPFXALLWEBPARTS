import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneDropdown
} from '@microsoft/sp-webpart-base';

import SalesCharts, { ISalesChartsProps } from './components/SalesCharts';

export interface ISalesChartsWebPartProps {
  apiBaseUrl: string;
  defaultYear: string;
  defaultRegion: string;
  defaultChartType: string;
}

export default class SalesChartsWebPart
  extends BaseClientSideWebPart<ISalesChartsWebPartProps> {

  public render(): void {
    const element: React.ReactElement<ISalesChartsProps> = React.createElement(
      SalesCharts,
      {
        apiBaseUrl: this.properties.apiBaseUrl || "http://localhost:3000",
        defaultYear: this.properties.defaultYear || "2024",
        defaultRegion: this.properties.defaultRegion || "All",
        defaultChartType: (this.properties.defaultChartType as any) || "bar"
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  // 👉 Property pane (right side panel in SPFx)
  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: "Configure MySQL Sales Charts web part"
          },
          groups: [
            {
              groupName: "API Settings",
              groupFields: [
                PropertyPaneTextField('apiBaseUrl', {
                  label: 'API Base URL',
                  description: 'Example: http://localhost:3000'
                })
              ]
            },
            {
              groupName: "Default Filters",
              groupFields: [
                PropertyPaneTextField('defaultYear', {
                  label: 'Default Year',
                  description: 'Example: 2024'
                }),
                PropertyPaneDropdown('defaultRegion', {
                  label: 'Default Region',
                  options: [
                    { key: 'All', text: 'All' },
                    { key: 'North', text: 'North' },
                    { key: 'South', text: 'South' }
                  ]
                }),
                PropertyPaneDropdown('defaultChartType', {
                  label: 'Default Chart Type',
                  options: [
                    { key: 'bar', text: 'Bar' },
                    { key: 'line', text: 'Line' },
                    { key: 'pie', text: 'Pie' }
                  ]
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
