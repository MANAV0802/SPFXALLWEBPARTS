import * as React from 'react';
import * as ReactDom from 'react-dom';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import 'leaflet/dist/leaflet.css';
import MapComponent from './MapIntegration';

export default class MyMapWebPart extends BaseClientSideWebPart<any> {

  public render(): void {
    const element: React.ReactElement = React.createElement(
      MapComponent,
      {}
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
