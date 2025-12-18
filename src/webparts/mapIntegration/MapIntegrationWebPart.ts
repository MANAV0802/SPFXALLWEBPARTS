import * as React from "react";
import * as ReactDom from "react-dom";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";

import MapIntegration from "./components/MapIntegration";
import { initSP } from "../mapIntegration/pnpConfig";

export interface IMapIntegrationWebPartProps {}

export default class MapIntegrationWebPart extends BaseClientSideWebPart<IMapIntegrationWebPartProps> {
  public onInit(): Promise<void> {
    initSP(this.context);
    return Promise.resolve();
  }

  public render(): void {
    const element = React.createElement(MapIntegration, {});
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
