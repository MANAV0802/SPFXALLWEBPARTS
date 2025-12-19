import * as React from "react";
import styles from "./Results.module.scss";
import { Result } from "./Result";
import { IResultsProps } from "./IResultsProps";
import { IPerson } from "../../interfaces/IPerson";

const Results: React.FC<IResultsProps> = ({ results, loading, onSelect }) => {
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.searchResults}>
      {results.map((person: IPerson) => (
        <Result
          key={person.id}
          person={person}
          onSelect={onSelect} // ⭐ FIXED
        />
      ))}
    </div>
  );
};

export default Results;
