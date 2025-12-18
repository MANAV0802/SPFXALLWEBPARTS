import * as React from "react";
import styles from "./WeatherAqiWidget.module.scss";

export default function CitySearch(props: { onSearch: (city: string) => void }) {
  const [value, setValue] = React.useState("");

  return (
    <div className={styles.search}>
      <input
        className={styles.searchInput}
        placeholder="Search city..."
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button onClick={() => props.onSearch(value)}>Search</button>
    </div>
  );
}
