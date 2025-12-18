import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {getSp} from './pnpConfig';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import Crudoperations from './components/Crudoperations';
import { ICrudoperationsProps } from './components/ICrudoperationsProps';

export interface ICrudoperationsWebPartProps {
  description: string;
}

export default class CrudoperationsWebPart extends BaseClientSideWebPart<ICrudoperationsWebPartProps> {

  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';

  public render(): void {
    const element: React.ReactElement<ICrudoperationsProps> = React.createElement(
      Crudoperations,
      {
        description: this.properties.description,
        isDarkTheme: this._isDarkTheme,
        environmentMessage: this._environmentMessage,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName
      }
    );

    ReactDom.render(element, this.domElement);
  }

  public async onInit(): Promise<void> {
   await super.onInit();
    getSp(this.context);
  }


  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

 
}
