import * as React from "react";
import styles from "./WeatherAqiWidget.module.scss";
import { IForecastItem } from "../services/WeatherService";

interface IWeeklyForecastProps {
  forecast: IForecastItem[];
}

const WeeklyForecast: React.FC<IWeeklyForecastProps> = ({ forecast }) => {
  return (
    <div>
      {forecast.map((day, index) => (
        <div key={day.dt} className={styles.weekRow}>
          {/* Day */}
          <div style={{ fontWeight: index === 0 ? 600 : 500 }}>
            {index === 0 ? "Today" : day.day}
          </div>

          {/* Icon */}
          <img
            src={`https://openweathermap.org/img/wn/${day.icon}.png`}
            alt={day.day}
            width={32}
            height={32}
          />

          {/* Temperature */}
          <div style={{ fontWeight: 600 }}>
            {Math.round(day.temp)}°
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeeklyForecast;
