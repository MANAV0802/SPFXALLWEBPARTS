import {
  BaseClientSideWebPart
} from '@microsoft/sp-webpart-base';

import * as React from 'react';
import * as ReactDom from 'react-dom';

import Board from './components/Board';
import TaskService from './services/TaskService';

import { spfi, SPFx } from '@pnp/sp';

export default class PlannerBoardWebPart extends BaseClientSideWebPart<any> {

  public async onInit(): Promise<void> {
    const sp = spfi().using(SPFx(this.context));
    TaskService.init(sp);
    return super.onInit();
  }

  public render(): void {

    // ✅ FIXED: PASS CONTEXT TO BOARD
    const element = React.createElement(Board, {
      context: this.context
    });

    ReactDom.render(element, this.domElement);
  }
}
