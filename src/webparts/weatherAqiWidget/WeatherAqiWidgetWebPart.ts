import * as React from "react";
import * as ReactDom from "react-dom";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { IPropertyPaneConfiguration, PropertyPaneTextField } from "@microsoft/sp-property-pane";

import WeatherDashboard from "./components/WeatherDashboard";

export interface IWeatherAqiWidgetWebPartProps {
  apiKey: string;
}

export default class WeatherAqiWidgetWebPart
  extends BaseClientSideWebPart<IWeatherAqiWidgetWebPartProps> {

  public render(): void {

    const element = React.createElement(WeatherDashboard, {
  defaultCity: "Ahmedabad",
  context: this.context
});



    ReactDom.render(element, this.domElement);
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: "Weather & AQI Settings" },
          groups: [
            {
              groupName: "API Configuration",
              groupFields: [
                PropertyPaneTextField("apiKey", {
                  label: "OpenWeather API Key"
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
