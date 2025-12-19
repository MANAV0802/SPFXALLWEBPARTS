import { IPerson } from "../../interfaces/IPerson";

export interface IResultsProps {
  results: IPerson[];
  loading: boolean;
  onSelect: (person: IPerson) => void; // ⭐ ADD THIS
}
