import { IPropertyPaneCustomFieldProps } from '@microsoft/sp-property-pane';
import { IDropdownOption } from '@fluentui/react';

export interface IPropertyPaneGroupSelectProps extends IPropertyPaneCustomFieldProps {
  label: string;
  loadOptions: () => Promise<IDropdownOption[]>;
  onPropertyChange: (path: string, nv: string | number) => void;
  selected: number | string;
  disabled?: boolean;
}
