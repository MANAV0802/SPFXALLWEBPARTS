export interface IFlightStatus {
  flightNumber: string;
  airline: string;
  status: string;

  departureAirport: string;
  arrivalAirport: string;

  departureIata: string;
  arrivalIata: string;

  departureScheduled: string | null;
  arrivalScheduled: string | null;

  terminalDeparture?: string | null;
  gateDeparture?: string | null;
  terminalArrival?: string | null;
  gateArrival?: string | null;

  delayMinutes?: number | null;
  lastUpdated?: string | null;
}

export interface IAirportLocation {
  iata: string;
  name: string;
  lat: number;
  lng: number;
}

export class FlightStatusService {

  // Use HTTPS (was http previously)
  private static readonly BASE_URL: string = 'https://api.aviationstack.com/v1';

  // Fallback key (for demo). Replace/remove for production and prefer passing apiKey explicitly.
  private static readonly FALLBACK_API_KEY: string = 'dc458dc6eb1348b7d5a8e0c54b144af6';

  // Helper to use provided apiKey or fallback
  private static resolveKey(apiKey?: string): string {
    return (apiKey && apiKey.trim()) ? apiKey : this.FALLBACK_API_KEY;
  }

  // ----- SINGLE FLIGHT BY NUMBER -----
  public static async getFlightStatus(
    flightNumber: string,
    apiKey?: string
  ): Promise<IFlightStatus | null> {

    const key = this.resolveKey(apiKey);

    const url = `${this.BASE_URL}/flights?access_key=${encodeURIComponent(key)}&flight_iata=${encodeURIComponent(flightNumber)}`;

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to call AviationStack flights endpoint (status ${response.status}). ${text}`);
    }

    const json: any = await response.json();
    const data: any[] = json && json.data ? json.data : [];

    if (!data.length) {
      return null;
    }

    const raw = data[0];
    return this.mapFlight(raw);
  }

  // ----- SNAPSHOT OF RECENT FLIGHTS -----
  public static async getDailyFlights(
    apiKey?: string,
    limit: number = 50
  ): Promise<IFlightStatus[]> {

    const key = this.resolveKey(apiKey);

    const url =
      `${this.BASE_URL}/flights?access_key=${encodeURIComponent(key)}&limit=${encodeURIComponent(
        String(limit || 50)
      )}`;

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to call AviationStack flights endpoint (status ${response.status}). ${text}`);
    }

    const json: any = await response.json();
    const data: any[] = json && json.data ? json.data : [];

    const results: IFlightStatus[] = [];
    for (let i = 0; i < data.length; i++) {
      results.push(this.mapFlight(data[i]));
    }

    return results;
  }

  // ----- AIRPORT COORDINATES BY IATA -----
  public static async getAirportCoordinates(
    iataCode: string,
    apiKey?: string
  ): Promise<IAirportLocation | null> {

    if (!iataCode) return null;

    const key = this.resolveKey(apiKey);

    const url =
      `${this.BASE_URL}/airports?access_key=${encodeURIComponent(key)}&iata_code=${encodeURIComponent(
        iataCode
      )}`;

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Failed to call AviationStack airports endpoint (status ${response.status}). ${text}`);
    }

    const json: any = await response.json();
    const data: any[] = json && json.data ? json.data : [];

    if (!data.length) {
      return null;
    }

    const raw = data[0];

    if (
      typeof raw.latitude !== 'number' ||
      typeof raw.longitude !== 'number'
    ) {
      return null;
    }

    return {
      iata: raw.iata_code || iataCode,
      name: raw.airport_name || '',
      lat: raw.latitude,
      lng: raw.longitude
    };
  }

  // ----- INTERNAL MAPPING -----
  private static mapFlight(raw: any): IFlightStatus {
    const dep = raw && raw.departure ? raw.departure : {};
    const arr = raw && raw.arrival ? raw.arrival : {};
    const airline = raw && raw.airline ? raw.airline : {};
    const flight = raw && raw.flight ? raw.flight : {};

    const flightNumber: string =
      flight.iata || flight.icao || flight.number || '';

    const status: string = raw.flight_status || '';

    const departureAirport: string = dep.airport || '';
    const arrivalAirport: string = arr.airport || '';

    const departureIata: string = dep.iata || '';
    const arrivalIata: string = arr.iata || '';

    const departureScheduled: string | null = dep.scheduled || null;
    const arrivalScheduled: string | null = arr.scheduled || null;

    const delayMinutes: number | null =
      typeof dep.delay === 'number' ? dep.delay : null;

    const lastUpdated: string | null =
      dep.estimated || arr.estimated || null;

    return {
      flightNumber,
      airline: airline.name || '',
      status,

      departureAirport,
      arrivalAirport,

      departureIata,
      arrivalIata,

      departureScheduled,
      arrivalScheduled,

      terminalDeparture: dep.terminal || null,
      gateDeparture: dep.gate || null,
      terminalArrival: arr.terminal || null,
      gateArrival: arr.gate || null,

      delayMinutes,
      lastUpdated
    };
  }
}
