import {SPFI,spfi} from "@pnp/sp";
import {SPFx} from "@pnp/sp";
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/webs";
import "@pnp/sp/fields";

import type { ISPFXContext } from "@pnp/sp";

let _sp:SPFI;

export const getSp = (context?:ISPFXContext):SPFI=> {
    if(!_sp && context){
        _sp= spfi().using(SPFx(context));
    }
    return _sp;
  };