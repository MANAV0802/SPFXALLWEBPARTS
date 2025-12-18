import * as React from "react";
import styles from "./WeatherAqiWidget.module.scss";
import { IForecastItem } from "../services/WeatherService";

interface IHourlyForecastProps {
  forecast: IForecastItem[];
}

const HourlyForecast: React.FC<IHourlyForecastProps> = ({ forecast }) => {
  return (
    <div className={styles.hourlyScroll}>
      {forecast.map((hour, index) => (
        <div
          key={hour.dt}
          className={styles.hourCard}
          style={
            index === 0
              ? { outline: "2px solid rgba(59,130,246,0.5)" }
              : undefined
          }
        >
          <div className={styles.hourTime}>
            {index === 0 ? "Now" : hour.time}
          </div>

          <img
            src={`https://openweathermap.org/img/wn/${hour.icon}@2x.png`}
            alt={hour.time}
            width={42}
            height={42}
          />

          <div className={styles.hourTemp}>
            {Math.round(hour.temp)}°
          </div>
        </div>
      ))}
    </div>
  );
};

export default HourlyForecast;
