import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { IFlightStatusProps } from './IFlightStatusProps';
import { IFlightStatusState } from './IFlightStatusState';
import styles from './FlightStatus.module.scss';
import { FlightStatusService, IFlightStatus } from '../services/FlightStatusService';
import { SPComponentLoader } from '@microsoft/sp-loader';

// Leaflet will be loaded via CDN and exposed globally as "L"
declare const L: any;

// Simple dictionary of airport coordinates for the map demo
const airportCoordinates: { [iata: string]: { lat: number; lng: number } } = {
  // India
  DEL: { lat: 28.5562, lng: 77.1000 }, // Indira Gandhi International
  AMD: { "lat": 23.0779, "lng": 72.6346 },
  BOM: { lat: 19.0896, lng: 72.8656 }, // Mumbai
  BLR: { lat: 13.1986, lng: 77.7066 }, // Bengaluru
  HYD: { lat: 17.2403, lng: 78.4294 }, // Hyderabad
  MAA: { lat: 12.9941, lng: 80.1709 }, // Chennai
  COK: { "lat": 10.1520, "lng": 76.4019 },

  // International
  JFK: { lat: 40.6413, lng: -73.7781 }, // New York JFK
  LHR: { lat: 51.4700, lng: -0.4543 },  // London Heathrow
  DXB: { lat: 25.2532, lng: 55.3657 },  // Dubai
  SIN: { lat: 1.3644, lng: 103.9915 },  // Singapore Changi
  DOH: { lat: 25.2736, lng: 51.6081 },  // Doha
  BNE: { lat: -27.3842, lng: 153.1175 }, // Brisbane
  SYD: { lat: -33.9399, lng: 151.1753 },  // Sydney
  EWR: { "lat": 40.6895, "lng": -74.1745 }, // Newark
  IAD: { "lat": 38.9531, "lng": -77.4565 }, // Washington Dulles
  DCA: { "lat": 38.8512, "lng": -77.0402 }, // Reagan National
  ORD: { "lat": 41.9742, "lng": -87.9073 }, // Chicago O'Hare
  MIA: { "lat": 25.7959, "lng": -80.2870 }, // Miami
  BOS: { "lat": 42.3656, "lng": -71.0096 }, // Boston Logan
  YVR: { "lat": 49.1939, "lng": -123.1830 }, // Vancouver
  SEA: { "lat": 47.4502, "lng": -122.3088 }, // Seattle-Tacoma
  DEN: { "lat": 39.8561, "lng": -104.6737 }, // Denver
    // Europe
  MAD: { "lat": 40.4936, "lng": -3.5676 }, // Madrid Barajas
  BCN: { "lat": 41.2974, "lng": 2.0833 }, // Barcelona
  AMS: { "lat": 52.3105, "lng": 4.7683 }, // Amsterdam Schiphol
  ZRH: { "lat": 47.4581, "lng": 8.5550 }, // Zurich
  VIE: { "lat": 48.1103, "lng": 16.5697 }, // Vienna
  KHI: { "lat": 24.9060, "lng": 67.1603 }, // Karachi
  ISB: { "lat": 33.6169, "lng": 73.0679 }, // Islamabad
  KUL: { "lat": 2.7456,  "lng": 101.7090 }, // Kuala Lumpur
  BKK: { "lat": 13.689999, "lng": 100.750112 }, // Bangkok Suvarnabhumi
  AKL: { "lat": -37.0082, "lng": 174.7850 }, // Auckland
  MEL: { "lat": -37.6733, "lng": 144.8431 }, // Melbourne

  // South America & Africa
  GRU: { "lat": -23.4356, "lng": -46.4731 }, // Sao Paulo Guarulhos
  EZE: { "lat": -34.8222, "lng": -58.5358 }, // Buenos Aires EZE
  CPT: { "lat": -33.9700, "lng": 18.6021 }, // Cape Town
  JNB: { "lat": -26.1337, "lng": 28.2420 }  // Johannesburg
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return value;
    }
    return d.toLocaleString();
  } catch {
    return value;
  }
};

const getStatusClass = (status: string): string => {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'en-route' || s === 'scheduled') {
    return styles.statusOk;
  }
  if (s === 'cancelled' || s === 'canceled' || s === 'diverted') {
    return styles.statusBad;
  }
  if (s === 'landed' || s === 'arrived') {
    return styles.statusNeutral;
  }
  return '';
};

// Is the flight currently live/active?
const isLiveStatus = (status: string): boolean => {
  return !!status && status.toLowerCase() === 'active';
};

// Haversine distance in km between two lat/lng points
const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// helper to build unique array (ES5 friendly)
const buildUniqueStrings = (items: string[]): string[] => {
  const result: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const value = items[i];
    if (!value) {
      continue;
    }
    if (result.indexOf(value) === -1) {
      result.push(value);
    }
  }
  return result;
};

const FlightStatus: React.FC<IFlightStatusProps> = (props) => {

  const [state, setState] = useState<IFlightStatusState>({
    // single flight
    flightNumber: '',
    loading: false,
    error: null,
    result: null,
    // snapshot
    dailyFlights: [],
    dailyLoading: false,
    dailyError: null,
    // map
    selectedMapFlight: null,
    mapDistanceKm: null,
    mapMode: 'single',
    // filters
    airlineFilter: '',
    statusFilter: '',
    // auto-refresh
    autoRefreshEnabled: false,
    autoRefreshSeconds: 60,
    autoRefreshRemaining: 60
  });

  // API key resolver (property pane or fallback for demo)
  const resolveApiKey = (): string | null => {
    const fallback = 'dc458dc6eb1348b7d5a8e0c54b144af6'; // demo key – change/remove for production
    return props.apiKey || fallback || null;
  };

  // ======== MAP HANDLING USING LEAFLET ========

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapLibLoadedRef = useRef<boolean>(false);
  const planeMarkerRef = useRef<any>(null);
  const planeAnimationIntervalRef = useRef<number | null>(null);

  // Load Leaflet JS + CSS once
  useEffect(() => {
    SPComponentLoader.loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    SPComponentLoader.loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
      .then(() => {
        mapLibLoadedRef.current = true;
        if (state.selectedMapFlight) {
          const flightsForMap = getFilteredFlightsForMap(state.dailyFlights, state.airlineFilter, state.statusFilter);
          drawMap(state.selectedMapFlight, state.mapMode, flightsForMap);
        }
      })
      .catch((err: any) => console.error('Error loading Leaflet', err));

    // cleanup on unmount
    return () => {
      if (planeAnimationIntervalRef.current !== null) {
        window.clearInterval(planeAnimationIntervalRef.current);
        planeAnimationIntervalRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: apply filters to snapshot for map/table
  const getFilteredFlightsForMap = (
    flights: IFlightStatus[],
    airlineFilter: string,
    statusFilter: string
  ): IFlightStatus[] => {
    return flights.filter((f: IFlightStatus) => {
      if (airlineFilter && f.airline !== airlineFilter) {
        return false;
      }
      if (statusFilter && f.status && f.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  };

  // Redraw map whenever selection / mode / flights / filters change
  useEffect(() => {
    if (!mapLibLoadedRef.current) return;
    const flightsForMap = getFilteredFlightsForMap(state.dailyFlights, state.airlineFilter, state.statusFilter);
    drawMap(state.selectedMapFlight, state.mapMode, flightsForMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedMapFlight, state.mapMode, state.dailyFlights, state.airlineFilter, state.statusFilter]);

  const drawMap = (
    selected: IFlightStatus | null,
    mode: 'single' | 'multi',
    flightsForMap: IFlightStatus[]
  ): void => {
    if (!mapLibLoadedRef.current || !mapContainerRef.current) {
      return;
    }

    // clear any existing plane animation
    if (planeAnimationIntervalRef.current !== null) {
      window.clearInterval(planeAnimationIntervalRef.current);
      planeAnimationIntervalRef.current = null;
    }
    planeMarkerRef.current = null;

    // clear old map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const routes: {
      dep: { lat: number; lng: number };
      arr: { lat: number; lng: number };
      flight: IFlightStatus;
      isSelected: boolean;
      depCode: string;
      arrCode: string;
    }[] = [];

    const addRouteForFlight = (flight: IFlightStatus, isSelected: boolean) => {
      const depCode: string = (flight.departureIata || '').toUpperCase();
      const arrCode: string = (flight.arrivalIata || '').toUpperCase();
      const dep = airportCoordinates[depCode];
      const arr = airportCoordinates[arrCode];
      if (!dep || !arr) {
        return;
      }
      routes.push({ dep, arr, flight, isSelected, depCode, arrCode });
    };

    if (mode === 'single') {
      if (selected) {
        addRouteForFlight(selected, true);
      }
    } else {
      for (let i = 0; i < flightsForMap.length; i++) {
        const f = flightsForMap[i];
        const isSel =
          !!selected &&
          selected.flightNumber === f.flightNumber &&
          selected.departureAirport === f.departureAirport &&
          selected.arrivalAirport === f.arrivalAirport;
        addRouteForFlight(f, isSel);
      }
    }

    if (routes.length === 0) {
      setState(prev => ({
        ...prev,
        mapDistanceKm: null
      }));
      return;
    }

    const allLatLngs: [number, number][] = [];
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      allLatLngs.push([r.dep.lat, r.dep.lng], [r.arr.lat, r.arr.lng]);
    }

    const first = routes[0];
    const centerLat = (first.dep.lat + first.arr.lat) / 2;
    const centerLng = (first.dep.lng + first.arr.lng) / 2;

    const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 3);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 9,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // draw all routes (with tooltips)
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      const latlngs = [
        [r.dep.lat, r.dep.lng],
        [r.arr.lat, r.arr.lng]
      ];

      const poly = L.polyline(latlngs, {
        color: r.isSelected ? '#0078d4' : '#a0a0a0',
        weight: r.isSelected ? 3 : 1.5,
        dashArray: r.isSelected ? null : '6,6'
      }).addTo(map);

      // show flight + airline on hover
      const labelText = `${r.flight.flightNumber || ''}${r.flight.airline ? ' — ' + r.flight.airline : ''}`;
      poly.bindTooltip(labelText, {
        sticky: true,
        direction: 'center',
        opacity: 0.95
      });

      // ensure selected route stands out
      if (r.isSelected) {
        poly.bringToFront();
      }
    }

    let distanceForSelected: number | null = null;

    // get selected route, fallback to first
    let selectedRoute = routes[0];
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].isSelected) {
        selectedRoute = routes[i];
        break;
      }
    }

    if (selectedRoute) {
      const dep = selectedRoute.dep;
      const arr = selectedRoute.arr;

      const depMarker = L.circleMarker([dep.lat, dep.lng], {
        radius: 6,
        color: '#107c10',
        fillColor: '#107c10',
        fillOpacity: 0.9
      }).addTo(map);
      depMarker.bindPopup(`${selectedRoute.flight.departureAirport || 'Departure'} (${selectedRoute.depCode || 'N/A'})`);

      const arrMarker = L.circleMarker([arr.lat, arr.lng], {
        radius: 6,
        color: '#a4262c',
        fillColor: '#a4262c',
        fillOpacity: 0.9
      }).addTo(map);
      arrMarker.bindPopup(`${selectedRoute.flight.arrivalAirport || 'Arrival'} (${selectedRoute.arrCode || 'N/A'})`);

      // distance shown above the map
      distanceForSelected = distanceKm(dep.lat, dep.lng, arr.lat, arr.lng);

      // =========================
      //  PLANE ON TOP OF ROUTE (with label)
      // =========================
      const planeIcon = L.divIcon({
        html:
          `<div class="${styles.planeMarkerInner}">
             <div class="${styles.planeEmoji}">✈️</div>
             <div class="${styles.planeLabel}">${(selectedRoute.flight.flightNumber || '').toUpperCase()}</div>
           </div>`,
        className: 'leaflet-div-icon ' + styles.planeMarker,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      // Convert dep/arr to screen coords so the plane follows the line exactly
      const depLatLng: any = L.latLng(dep.lat, dep.lng);
      const arrLatLng: any = L.latLng(arr.lat, arr.lng);

      const depPoint: any = map.latLngToLayerPoint(depLatLng);
      const arrPoint: any = map.latLngToLayerPoint(arrLatLng);

      let totalSteps: number = 200;
      let currentStep: number = 20; // start ~10% from departure
      let directionForward: boolean = true;

      // Helper: interpolate in screen space, convert back to lat/lng
      const getLatLngOnRoute = (t: number): any => {
        const x = depPoint.x + (arrPoint.x - depPoint.x) * t;
        const y = depPoint.y + (arrPoint.y - depPoint.y) * t;
        const point = L.point(x, y);
        return map.layerPointToLatLng(point);
      };

      const startT: number = currentStep / totalSteps;
      const startLatLng: any = getLatLngOnRoute(startT);

      planeMarkerRef.current = L.marker(startLatLng, {
        icon: planeIcon,
        zIndexOffset: 1000
      }).addTo(map);

      // popup on click with some details
      planeMarkerRef.current.bindPopup(
        `<b>${selectedRoute.flight.flightNumber || ''}</b><br/>${selectedRoute.flight.airline || ''}<br/>${selectedRoute.flight.status || ''}`
      );

      planeAnimationIntervalRef.current = window.setInterval(function () {
        if (!planeMarkerRef.current) {
          return;
        }

        if (directionForward) {
          currentStep++;
          if (currentStep >= totalSteps) {
            currentStep = totalSteps;
            directionForward = false;
          }
        } else {
          currentStep--;
          if (currentStep <= 0) {
            currentStep = 0;
            directionForward = true;
          }
        }

        const t: number = currentStep / totalSteps;
        const newLatLng: any = getLatLngOnRoute(t);
        planeMarkerRef.current.setLatLng(newLatLng);

        // ensure plane stays above the polyline visually
        if (planeMarkerRef.current && planeMarkerRef.current._icon) {
          planeMarkerRef.current._icon.style.zIndex = '1000';
        }
      }, 80);
    }

    map.fitBounds(allLatLngs, { padding: [40, 40] });

    mapInstanceRef.current = map;

    setState(prev => ({
      ...prev,
      mapDistanceKm: distanceForSelected
    }));
  };

  // ======== AUTO REFRESH TIMER ========

  useEffect(() => {
    if (!state.autoRefreshEnabled || !state.flightNumber) {
      return;
    }

    let intervalId: number | undefined;

    intervalId = window.setInterval(() => {
      let shouldRefresh: boolean = false;

      setState(prev => {
        if (!prev.autoRefreshEnabled || !prev.flightNumber) {
          return prev;
        }

        const current = prev.autoRefreshRemaining || prev.autoRefreshSeconds;
        const next = current - 1;

        if (next <= 0) {
          shouldRefresh = true;
          return {
            ...prev,
            autoRefreshRemaining: prev.autoRefreshSeconds
          };
        }

        return {
          ...prev,
          autoRefreshRemaining: next
        };
      });

      if (shouldRefresh) {
        triggerAutoRefresh();
      }
    }, 1000);

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.autoRefreshEnabled, state.flightNumber, state.autoRefreshSeconds]);

  const triggerAutoRefresh = async (): Promise<void> => {
    if (!state.flightNumber) {
      return;
    }

    const apiKeyToUse = resolveApiKey();

    if (!apiKeyToUse) {
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null
      }));

      const result: IFlightStatus | null =
        await FlightStatusService.getFlightStatus(
          state.flightNumber,
          apiKeyToUse
        );

      if (!result) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: `No flight found with number "${state.flightNumber}".`,
          result: null,
          selectedMapFlight: null
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        result,
        selectedMapFlight: result
      }));

    } catch (error: any) {
      console.error('Error auto-refreshing flight status', error);
      setState(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  const toggleAutoRefresh = (): void => {
    setState(prev => ({
      ...prev,
      autoRefreshEnabled: !prev.autoRefreshEnabled,
      autoRefreshRemaining: !prev.autoRefreshEnabled
        ? prev.autoRefreshSeconds
        : prev.autoRefreshRemaining
    }));
  };

  // ========== SINGLE FLIGHT SEARCH ==========

  const onFlightNumberChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value.toUpperCase();
    setState(prev => ({
      ...prev,
      flightNumber: value
    }));
  };

  const searchFlight = async (): Promise<void> => {

    if (!state.flightNumber) {
      setState(prev => ({
        ...prev,
        error: 'Please enter a flight number (e.g. AI101).',
        result: null,
        selectedMapFlight: null
      }));
      return;
    }

    const apiKeyToUse = resolveApiKey();

    if (!apiKeyToUse) {
      setState(prev => ({
        ...prev,
        error: 'API key is not configured. Edit the web part and set your AviationStack API key.',
        result: null,
        selectedMapFlight: null
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        result: null,
        selectedMapFlight: null,
        autoRefreshRemaining: prev.autoRefreshEnabled
          ? prev.autoRefreshSeconds
          : prev.autoRefreshRemaining
      }));

      const result: IFlightStatus | null =
        await FlightStatusService.getFlightStatus(
          state.flightNumber,
          apiKeyToUse
        );

      if (!result) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: `No flight found with number "${state.flightNumber}".`,
          result: null,
          selectedMapFlight: null
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        result,
        selectedMapFlight: result
      }));

    } catch (error: any) {
      console.error('Error fetching flight status', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch flight status. Please try again later.',
        result: null,
        selectedMapFlight: null
      }));
    }
  };

  const onKeyPress = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      searchFlight();
    }
  };

  const renderSingleResult = (): JSX.Element | null => {
    if (!state.result) return null;

    const r = state.result;
    const mapped = state.selectedMapFlight;

    return (
      <>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.flightTitle}>
              <span className={styles.flightNumber}>{r.flightNumber}</span>
              {r.airline && (
                <span className={styles.airlineName}>{r.airline}</span>
              )}
            </div>
            <div className={`${styles.statusBadge} ${getStatusClass(r.status)}`}>
              {isLiveStatus(r.status) && (
                <span className={styles.liveChip}>LIVE</span>
              )}
              {r.status || 'Unknown'}
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>ROUTE</div>
              <div className={styles.routeRow}>
                <div className={styles.airportBlock}>
                  <div className={styles.label}>From</div>
                  <div className={styles.value}>{r.departureAirport || '-'}</div>
                </div>
                <div className={styles.arrow}>→</div>
                <div className={styles.airportBlock}>
                  <div className={styles.label}>To</div>
                  <div className={styles.value}>{r.arrivalAirport || '-'}</div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>SCHEDULE</div>
              <div className={styles.scheduleRow}>
                <div className={styles.scheduleBlock}>
                  <div className={styles.label}>Departure (scheduled)</div>
                  <div className={styles.value}>
                    {formatDateTime(r.departureScheduled)}
                  </div>
                  {(r.terminalDeparture || r.gateDeparture) && (
                    <div className={styles.subValue}>
                      Terminal {r.terminalDeparture || '-'}, Gate {r.gateDeparture || '-'}
                    </div>
                  )}
                </div>
                <div className={styles.scheduleBlock}>
                  <div className={styles.label}>Arrival (scheduled)</div>
                  <div className={styles.value}>
                    {formatDateTime(r.arrivalScheduled)}
                  </div>
                  {(r.terminalArrival || r.gateArrival) && (
                    <div className={styles.subValue}>
                      Terminal {r.terminalArrival || '-'}, Gate {r.gateArrival || '-'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.sectionFooter}>
              {r.delayMinutes != null && (
                <div className={styles.delayInfo}>
                  Delay: {r.delayMinutes} minutes
                </div>
              )}
              {r.lastUpdated && (
                <div className={styles.updateInfo}>
                  Last updated: {formatDateTime(r.lastUpdated)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAP CARD */}
        <div className={styles.mapCard}>
          <div className={styles.mapHeader}>
            <div>
              <div className={styles.sectionTitle}>ROUTE MAP</div>
              {mapped && (
                <div className={styles.mapFlightTitle}>
                  {mapped.flightNumber}{' '}
                  ({(mapped.departureIata || '???').toUpperCase()} → {(mapped.arrivalIata || '???').toUpperCase()})
                </div>
              )}
              {state.mapDistanceKm != null && (
                <div className={styles.mapMeta}>
                  Approx distance: {state.mapDistanceKm.toFixed(0)} km
                </div>
              )}
            </div>

            <div className={styles.mapControls}>
              <div className={styles.mapModeToggle}>
                <button
                  className={state.mapMode === 'single' ? styles.mapModeButtonActive : styles.mapModeButton}
                  onClick={() => setState(prev => ({ ...prev, mapMode: 'single' }))}
                >
                  Single route
                </button>
                <button
                  className={state.mapMode === 'multi' ? styles.mapModeButtonActive : styles.mapModeButton}
                  onClick={() => setState(prev => ({ ...prev, mapMode: 'multi' }))}
                >
                  All routes
                </button>
              </div>

              <div className={styles.mapLegend}>
                <span className={`${styles.legendDot} ${styles.legendDotDeparture}`}></span> Departure
                <span className={`${styles.legendDot} ${styles.legendDotArrival}`}></span> Arrival
              </div>
            </div>
          </div>

          {/* auto refresh UI */}
          {state.flightNumber && (
            <div className={styles.autoRefreshBar}>
              <button
                type="button"
                className={state.autoRefreshEnabled ? styles.autoRefreshToggleOn : styles.autoRefreshToggleOff}
                onClick={toggleAutoRefresh}
              >
                <span className={styles.autoRefreshDot}></span>
                Auto refresh
              </button>
              {state.autoRefreshEnabled && (
                <div className={styles.autoRefreshCountdown}>
                  Refresh in {state.autoRefreshRemaining}s
                </div>
              )}
            </div>
          )}

          <div ref={mapContainerRef} className={styles.mapContainer}></div>
        </div>
      </>
    );
  };

  // ========== RECENT FLIGHTS SNAPSHOT ==========

  const loadDailyFlights = async (): Promise<void> => {
    const apiKeyToUse = resolveApiKey();

    if (!apiKeyToUse) {
      setState(prev => ({
        ...prev,
        dailyError: 'API key is not configured. Edit the web part and set your AviationStack API key.',
        dailyFlights: []
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        dailyLoading: true,
        dailyError: null,
        dailyFlights: []
      }));

      const flights: IFlightStatus[] =
        await FlightStatusService.getDailyFlights(
          apiKeyToUse,
          50
        );

      if (!flights || flights.length === 0) {
        setState(prev => ({
          ...prev,
          dailyLoading: false,
          dailyError: 'No flights found in the current snapshot.',
          dailyFlights: []
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        dailyLoading: false,
        dailyError: null,
        dailyFlights: flights
      }));

    } catch (error: any) {
      console.error('Error fetching snapshot flights', error?.response?.data || error);
      const apiMessage = error?.response?.data?.error?.message;

      setState(prev => ({
        ...prev,
        dailyLoading: false,
        dailyError: apiMessage || 'Failed to fetch recent flights. Please try again later.',
        dailyFlights: []
      }));
    }
  };

  const onSnapshotRowClick = (flight: IFlightStatus): void => {
    setState(prev => ({
      ...prev,
      selectedMapFlight: flight,
      result: flight,
      flightNumber: flight.flightNumber
    }));
  };

  const onAirlineFilterChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = event.target.value;
    setState(prev => ({
      ...prev,
      airlineFilter: value
    }));
  };

  const onStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = event.target.value;
    setState(prev => ({
      ...prev,
      statusFilter: value
    }));
  };

  const renderDailyFlights = (): JSX.Element | null => {
    if (state.dailyFlights.length === 0 && !state.dailyError) {
      return null;
    }

    const filteredFlights = getFilteredFlightsForMap(
      state.dailyFlights,
      state.airlineFilter,
      state.statusFilter
    );

    const selected = state.selectedMapFlight;

    const airlineList: string[] = [];
    for (let i = 0; i < state.dailyFlights.length; i++) {
      airlineList.push(state.dailyFlights[i].airline || '');
    }
    const airlineOptions = buildUniqueStrings(airlineList).sort();

    const statusList: string[] = [];
    for (let i = 0; i < state.dailyFlights.length; i++) {
      const st = (state.dailyFlights[i].status || '').toLowerCase();
      statusList.push(st);
    }
    const statusOptions = buildUniqueStrings(statusList).sort();

    return (
      <div className={styles.dailySection}>
        {state.dailyError && (
          <div className={styles.errorMessage}>
            {state.dailyError}
          </div>
        )}

        {state.dailyFlights.length > 0 && (
          <>
            <div className={styles.filtersRow}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Airline</span>
                <select
                  className={styles.filterSelect}
                  value={state.airlineFilter}
                  onChange={onAirlineFilterChange}
                >
                  <option value="">All</option>
                  {airlineOptions.map((a: string) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Status</span>
                <select
                  className={styles.filterSelect}
                  value={state.statusFilter}
                  onChange={onStatusFilterChange}
                >
                  <option value="">All</option>
                  {statusOptions.map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredFlights.length === 0 && !state.dailyError && (
              <div className={styles.errorMessage}>
                No flights match the selected filters.
              </div>
            )}

            {filteredFlights.length > 0 && (
              <div className={styles.dailyTableWrapper}>
                <table className={styles.dailyTable}>
                  <thead>
                    <tr>
                      <th>Flight</th>
                      <th>Airline</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Departure</th>
                      <th>Arrival</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFlights.map((f: IFlightStatus, idx: number) => {
                      const isSelected =
                        !!selected &&
                        selected.flightNumber === f.flightNumber &&
                        selected.departureAirport === f.departureAirport &&
                        selected.arrivalAirport === f.arrivalAirport;

                      return (
                        <tr
                          key={idx}
                          className={isSelected ? styles.snapshotRowSelected : styles.snapshotRow}
                          onClick={() => onSnapshotRowClick(f)}
                        >
                          <td>{f.flightNumber}</td>
                          <td>{f.airline}</td>
                          <td>{f.departureAirport}</td>
                          <td>{f.arrivalAirport}</td>
                          <td>{formatDateTime(f.departureScheduled)}</td>
                          <td>{formatDateTime(f.arrivalScheduled)}</td>
                          <td>
                            <span className={`${styles.statusPill} ${getStatusClass(f.status)}`}>
                              {f.status || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className={styles.dailySummary}>
                  Click a row to show its route on the map. Showing {filteredFlights.length} flights.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ========== RENDER ==========

  return (
    <div className={styles.flightStatus}>
      {/* Single flight section */}
      <div className={styles.header}>
        <div className={styles.title}>Flight Status Tracker</div>
        <div className={styles.subtitle}>
          Enter a flight number (e.g. AI101) to view the latest status from AviationStack.
        </div>
      </div>

      <div className={styles.searchPanel}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Enter flight number (e.g. AI101)"
          value={state.flightNumber}
          onChange={onFlightNumberChange}
          onKeyPress={onKeyPress}
        />
        <button
          className={styles.searchButton}
          onClick={searchFlight}
          disabled={state.loading}
        >
          {state.loading ? 'Checking...' : 'Track Flight'}
        </button>
      </div>

      {!props.apiKey && (
        <div className={styles.infoMessage}>
          ⚠️ API key is not set in the web part. It is currently using the internal fallback key.
          For production, edit this web part and configure your AviationStack API key.
        </div>
      )}

      {state.error && (
        <div className={styles.errorMessage}>
          {state.error}
        </div>
      )}

      {/* shimmer while loading */}
      {state.loading && (
        <div className={styles.shimmerCard}>
          <div className={styles.shimmerHeader}></div>
          <div className={styles.shimmerLine}></div>
          <div className={styles.shimmerLine}></div>
          <div className={styles.shimmerLineShort}></div>
        </div>
      )}

      {!state.loading && renderSingleResult()}

      {/* Recent flights snapshot section */}
      <div className={styles.dailyHeader}>
        <div className={styles.titleSmall}>Recent Flights Snapshot</div>
        <div className={styles.subtitle}>
          Shows a snapshot of the latest flights from AviationStack (free plan, no date filter).
        </div>
      </div>

      <div className={styles.dailySection}>
        <button
          className={styles.searchButton}
          onClick={loadDailyFlights}
          disabled={state.dailyLoading}
        >
          {state.dailyLoading ? 'Loading...' : 'Load Recent Flights'}
        </button>
      </div>

      {renderDailyFlights()}
    </div>
  );
};

export default FlightStatus;
