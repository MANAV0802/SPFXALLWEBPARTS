import { IFlightStatus } from '../services/FlightStatusService';

export interface IFlightStatusState {
  // single-flight search
  flightNumber: string;
  loading: boolean;
  error: string | null;
  result: IFlightStatus | null;

  // recent flights snapshot
  dailyFlights: IFlightStatus[];
  dailyLoading: boolean;
  dailyError: string | null;

  // map selection
  selectedMapFlight: IFlightStatus | null;
  mapDistanceKm: number | null; // approximate route distance

  // map mode: single flight vs all snapshot routes
  mapMode: 'single' | 'multi';

  // snapshot filters
  airlineFilter: string; // '' = all
  statusFilter: string;  // '' = all

  // auto-refresh for single-flight status
  autoRefreshEnabled: boolean;
  autoRefreshSeconds: number;
  autoRefreshRemaining: number;
}
