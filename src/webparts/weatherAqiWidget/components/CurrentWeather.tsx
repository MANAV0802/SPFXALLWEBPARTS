import * as React from "react";
import styles from "./WeatherAqiWidget.module.scss";
import { ICurrentWeather } from "../services/WeatherService";

export interface ICurrentWeatherProps {
  weather: ICurrentWeather;
}

const CurrentWeather: React.FC<ICurrentWeatherProps> = ({ weather }) => {
  return (
    <div className={styles.currentCard}>
      {/* City */}
      <div>
        <h2>{weather.city}</h2>
        <div className={styles.currentDesc}>
          {weather.description}
        </div>
      </div>

      {/* Temperature */}
      <div className={styles.currentTemp}>
        {Math.round(weather.temp)}°C
      </div>
    </div>
  );
};

export default CurrentWeather;
