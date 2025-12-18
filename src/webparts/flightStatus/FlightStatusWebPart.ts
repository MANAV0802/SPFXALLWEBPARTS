import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'FlightStatusWebPartStrings';
import FlightStatus from './components/FlightStatus';
import { IFlightStatusProps } from './components/IFlightStatusProps';

export interface IFlightStatusWebPartProps {
  apiKey: string; // AviationStack API key (NOTE: storing keys client-side is not secure for production)
}

export default class FlightStatusWebPart
  extends BaseClientSideWebPart<IFlightStatusWebPartProps> {

  public render(): void {
    // Trim whitespace to avoid accidental spaces in the property value
    const apiKey = (this.properties.apiKey || '').trim();

    const element: React.ReactElement<IFlightStatusProps> = React.createElement(
      FlightStatus,
      {
        apiKey: apiKey
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  /**
   * Simple client-side validation for the API key field.
   * Returns an empty string when valid, or an error message when invalid.
   * Note: this checks only presence/length — it does not verify the key with the API.
   */
  private validateApiKey(value: string): string {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return 'API key is required for the flight tracker to function (or you can rely on the demo fallback key).';
    }
    // Optionally require minimum length (adjust as needed)
    if (trimmed.length < 20) {
      return 'This value looks too short to be a valid AviationStack API key.';
    }
    return '';
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
                PropertyPaneTextField('apiKey', {
                  label: strings.ApiKeyFieldLabel,
                  description: 'Enter your AviationStack API key',
                  // show an immediate error message if empty or obviously invalid
                  onGetErrorMessage: this.validateApiKey.bind(this),
                  // provide a placeholder so editors know what to paste
                  placeholder: 'e.g. dc458dc6eb1348b7d5a8e0c54b144af6'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
