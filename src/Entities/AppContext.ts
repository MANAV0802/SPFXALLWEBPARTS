import * as React from "react";
import { IAppContext } from './IAppContext';

export const AppContext = React.createContext<IAppContext | undefined>(undefined);
