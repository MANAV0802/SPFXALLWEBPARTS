import * as React from "react";
import {
  Card,
  makeStyles,
  shorthands,
  Text,
  Avatar
} from "@fluentui/react-components";
import { IPerson } from "../../interfaces/IPerson";

export interface IResultProps {
  person: IPerson;
  onSelect: (person: IPerson) => void;
}

const useStyles = makeStyles({
  card: {
    width: "260px",
    height: "130px",
    margin: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    ":hover": {
      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
      transform: "translateY(-3px)"
    }
  },
  container: {
    display: "flex",
    alignItems: "center",
    padding: "12px",
    gap: "14px"
  },
  name: {
    fontWeight: 600,
    fontSize: "16px",
    marginBottom: "4px"
  },
  dept: {
    color: "#666",
    fontSize: "13px"
  }
});

export const Result: React.FC<IResultProps> = ({ person, onSelect }) => {
  const styles = useStyles();

  return (
    <Card className={styles.card} onClick={() => onSelect(person)}>
      <div className={styles.container}>
        <Avatar name={person.displayName} color="brand" />
        <div>
          <Text className={styles.name}>{person.displayName}</Text>
          <Text className={styles.dept}>{person.department || "—"}</Text>
        </div>
      </div>
    </Card>
  );
};
