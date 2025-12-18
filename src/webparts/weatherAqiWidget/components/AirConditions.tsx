import * as React from "react";
import styles from "./WeatherAqiWidget.module.scss";
import { ICurrentWeather } from "../services/WeatherService";

interface IAirConditionsProps {
  weather: ICurrentWeather;
}

const getAqiInfo = (aqi: number) => {
  if (aqi <= 1) {
    return { label: "Good", color: "#16a34a", advice: "Air quality is healthy." };
  }
  if (aqi === 2) {
    return { label: "Fair", color: "#84cc16", advice: "Acceptable air quality." };
  }
  if (aqi === 3) {
    return { label: "Moderate", color: "#facc15", advice: "Sensitive people should be cautious." };
  }
  if (aqi === 4) {
    return { label: "Poor", color: "#f97316", advice: "Limit prolonged outdoor activity." };
  }
  return { label: "Very Poor", color: "#dc2626", advice: "Avoid outdoor activity." };
};

const AirConditions: React.FC<IAirConditionsProps> = ({ weather }) => {
const aqiValue = weather.aqi ?? 0;
const aqiInfo = getAqiInfo(aqiValue);

  return (
    <div className={styles.airBox}>
      <div className={styles.airItem}>
        💧 <strong>Humidity</strong>
        <div>{weather.humidity}%</div>
      </div>

      <div className={styles.airItem}>
        🌬 <strong>Wind</strong>
        <div>{weather.wind} km/h</div>
      </div>

      <div className={styles.airItem}>
        📊 <strong>AQI</strong>
        <div
          style={{
            color: aqiInfo.color,
            fontWeight: 600
          }}
        >
          {weather.aqi} • {aqiInfo.label}
        </div>
        <div style={{ fontSize: "12px", opacity: 0.8 }}>
          {aqiInfo.advice}
        </div>
      </div>
    </div>
  );
};

export default AirConditions;
