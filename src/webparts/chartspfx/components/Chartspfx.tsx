import * as React from "react";
import styles from "./Chartspfx.module.scss";
import { ProductChart } from "./ProductChart";

export default class Chartspfx extends React.Component<any> {
  public render(): React.ReactElement<any> {
    return (
      <section className={styles.chartspfx}>
        <ProductChart />
      </section>
    );
  }
}
