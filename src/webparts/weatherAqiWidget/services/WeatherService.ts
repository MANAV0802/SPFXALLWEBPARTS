import { HttpClient, HttpClientResponse } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";

const API_KEY = "3707d6ff833bb8c3fefb57bfcea957f5"; // ✅ hardcoded as you want

export interface ICurrentWeather {
  city: string;
  temp: number;
  description: string;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  pressure: number;
  lat: number;
  lon: number;
  aqi?: number;
}

export interface IForecastItem {
  dt: number;
  time: string;
  temp: number;
  icon: string;
  wind: number;
  day?: string;
}

export class WeatherService {
  private httpClient: HttpClient;

  constructor(context: WebPartContext) {
    this.httpClient = context.httpClient;
  }

  private async get(url: string): Promise<any> {
    const response: HttpClientResponse =
      await this.httpClient.get(url, HttpClient.configurations.v1);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    return response.json();
  }

  async getCurrent(city: string): Promise<ICurrentWeather> {
    const data = await this.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${API_KEY}&units=metric`
    );

    const aqiData = await this.get(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${API_KEY}`
    );

    return {
      city: `${data.name}, ${data.sys.country}`,
      temp: Math.round(data.main.temp),
      description: data.weather[0].description,
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      wind: Math.round(data.wind.speed * 3.6),
      pressure: data.main.pressure,
      lat: data.coord.lat,
      lon: data.coord.lon,
      aqi: aqiData.list[0].main.aqi
    };
  }

  async getForecast(city: string): Promise<IForecastItem[]> {
    const data = await this.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        city
      )}&appid=${API_KEY}&units=metric`
    );

    return data.list.map((item: any) => ({
      dt: item.dt,
      time: new Date(item.dt * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      }),
      temp: Math.round(item.main.temp),
      icon: item.weather[0].icon,
      wind: Math.round(item.wind.speed * 3.6),
      day: new Date(item.dt * 1000).toLocaleDateString("en-US", {
        weekday: "short"
      })
    }));
  }
}
