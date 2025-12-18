import * as React from "react";
import styles from "./WeatherAqiWidget.module.scss";

import CitySearch from "./CitySearch";
import CurrentWeather from "./CurrentWeather";
import AirConditions from "./AirConditions";
import HourlyForecast from "./HourlyForecast";
import WeeklyForecast from "./WeeklyForecast";

import {
  WeatherService,
  ICurrentWeather,
  IForecastItem
} from "../services/WeatherService";

import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IWeatherDashboardProps {
  defaultCity: string;
  context: WebPartContext;
}

const WeatherDashboard: React.FC<IWeatherDashboardProps> = ({
  defaultCity,
  context
}) => {
  const service = React.useMemo(
    () => new WeatherService(context),
    [context]
  );

  const [city, setCity] = React.useState(defaultCity);
  const [weather, setWeather] = React.useState<ICurrentWeather | null>(null);
  const [forecast, setForecast] = React.useState<IForecastItem[]>([]);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadWeather = async (c: string) => {
    try {
      setLoading(true);
      setError(null);

      const current = await service.getCurrent(c);
      const fc = await service.getForecast(c);

      setCity(c);
      setWeather(current);
      setForecast(fc);
    } catch {
      setError("Unable to fetch weather data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadWeather(city);
  }, []);

  return (
    <div className={`${styles.app} ${styles[theme]}`}>
      <div className={styles.topBar}>
        <CitySearch onSearch={loadWeather} />

        <button
          className={styles.themeToggle}
          onClick={() =>
            setTheme(prev => (prev === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>

      {loading && <div className={styles.loader}>Loading weather…</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && weather && (
        <main className={styles.dashboard}>
          <section className={styles.heroCard}>
            <CurrentWeather weather={weather} />
          </section>

          <section className={styles.conditionsCard}>
            <AirConditions weather={weather} />
          </section>

          <section className={styles.hourlyCard}>
            <h3 className={styles.sectionTitle}>Hourly Forecast</h3>
            <HourlyForecast forecast={forecast.slice(0, 12)} />
          </section>

          <section className={styles.weeklyCard}>
            <h3 className={styles.sectionTitle}>7-Day Forecast</h3>
            <WeeklyForecast forecast={forecast.filter((_, i) => i % 8 === 0)} />
          </section>
        </main>
      )}
    </div>
  );
};

export default WeatherDashboard;
