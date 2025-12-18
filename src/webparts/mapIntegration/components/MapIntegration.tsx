import * as React from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { getSP } from "../pnpConfig";

const iconRetina = require("leaflet/dist/images/marker-icon-2x.png");
const iconDefault = require("leaflet/dist/images/marker-icon.png");
const iconShadow = require("leaflet/dist/images/marker-shadow.png");

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconDefault,
  shadowUrl: iconShadow,
});

// ---- TYPES ----
interface ILocationItem {
  Id: number;
  Project: string;
  Address: string;
  Lat?: number;
  Lng?: number;
}

interface ILocationIQSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

const LOCATIONIQ_KEY = "pk.f3adfaeede2ad978e581819f7961d722"; // <-- put your LocationIQ key

// for suggestion debounce
let formSuggestTimeout: any = null;
let manualSuggestTimeout: any = null;

const MapIntegration: React.FC = () => {
  const sp = React.useMemo(() => getSP(), []);

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstance = React.useRef<L.Map | null>(null);
  const markerLayer = React.useRef<L.LayerGroup | null>(null);
  const routingCtrl = React.useRef<any>(null);

  // list items
  const [locations, setLocations] = React.useState<ILocationItem[]>([]);

  // project filter
  const [selectedProject, setSelectedProject] = React.useState<string>("all");

  // source / destination
  const [sourceId, setSourceId] = React.useState<number | null>(null);
  const [destinationId, setDestinationId] = React.useState<number | null>(null);

  // manual destination
  const [manualDestination, setManualDestination] = React.useState("");
  const [manualCoords, setManualCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [manualSuggestions, setManualSuggestions] = React.useState<
    ILocationIQSuggestion[]
  >([]);

  // user location
  const [userLocation, setUserLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [info, setInfo] = React.useState("");

  // add-location modal
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [formProject, setFormProject] = React.useState("");
  const [formAddress, setFormAddress] = React.useState("");
  const [formCoords, setFormCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [formSuggestions, setFormSuggestions] = React.useState<
    ILocationIQSuggestion[]
  >([]);

  // ---- helpers for mutual disable ----
  const dropdownDestinationActive = destinationId !== null;
  const manualDestinationActive =
    manualDestination.trim().length > 0 || manualCoords !== null;
  const canGo =
    destinationId !== null ||
    manualDestination.trim().length > 0 ||
    manualCoords !== null;

  // ---------------- INIT MAP ----------------
  React.useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;

    const map = L.map(mapRef.current).setView([22.3039, 70.8022], 12);
    mapInstance.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    loadLocations();
  }, []);

  // ---------------- LOAD LOCATIONS ----------------
  const loadLocations = async () => {
    try {
      console.log("map run successfully...");
      const items: any[] = await sp.web.lists
        .getByTitle("ProjectLocation")
        .items.select("Id", "Project", "Address", "Location")();

      const mapped: ILocationItem[] = items.map((i: any) => {
        let lat: number | undefined;
        let lng: number | undefined;

        const locField = i.Location;
        if (locField) {
          if (typeof locField === "string") {
            try {
              const parsed = JSON.parse(locField);
              if (parsed && parsed.Coordinates) {
                lat = Number(parsed.Coordinates.Latitude);
                lng = Number(parsed.Coordinates.Longitude);
              }
            } catch {
              // ignore parse error
            }
          } else if (locField.Coordinates) {
            lat = Number(locField.Coordinates.Latitude);
            lng = Number(locField.Coordinates.Longitude);
          }
        }

        return {
          Id: i.Id,
          Project: i.Project,
          Address: i.Address,
          Lat: lat,
          Lng: lng,
        };
      });

      setLocations(mapped);
    } catch (err) {
      console.error("Error loading locations:", err);
    }
  };

  // ---------------- PROJECT NAMES ----------------
  const projectNames = React.useMemo(() => {
    const arr: string[] = [];
    for (const l of locations) {
      if (arr.indexOf(l.Project) === -1) {
        arr.push(l.Project);
      }
    }
    return arr;
  }, [locations]);

  // ---------------- FILTERED LOCATIONS (by project) ----------------
  const filteredLocations = React.useMemo(() => {
    if (selectedProject === "all" || !selectedProject) {
      return locations;
    }
    const arr: ILocationItem[] = [];
    for (const l of locations) {
      if (l.Project === selectedProject) arr.push(l);
    }
    return arr;
  }, [locations, selectedProject]);

  // ---------------- DRAW MARKERS WHEN FILTER CHANGES ----------------
  React.useEffect(() => {
    console.log("🗺️ MapIntegration WebPart Loaded Successfully!");

    if (!mapInstance.current) return;

    if (!markerLayer.current) {
      markerLayer.current = L.layerGroup().addTo(mapInstance.current);
    }
    markerLayer.current.clearLayers();

    for (const item of filteredLocations) {
      if (item.Lat == null || item.Lng == null) continue;
      L.marker([item.Lat, item.Lng])
        .addTo(markerLayer.current!)
        .bindPopup(`<b>${item.Project}</b><br/>${item.Address}`);
    }
  }, [filteredLocations]);

  // ---------------- USE CURRENT LOCATION ----------------
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setSourceId(-1); // special ID

        if (!mapInstance.current) return;
        L.marker([lat, lng])
          .addTo(mapInstance.current)
          .bindPopup("📍 You are here")
          .openPopup();
        mapInstance.current.setView([lat, lng], 14);
        toast.success("Current location detected!");
      },
      (err) => toast.error("Location error: " + err.message)
    );
  };

  // ---------------- FORM SUGGESTIONS (ADD LOCATION) ----------------
  const fetchFormSuggestions = (query: string) => {
    if (!query || query.length < 3) {
      setFormSuggestions([]);
      return;
    }

    if (formSuggestTimeout) clearTimeout(formSuggestTimeout);

    formSuggestTimeout = setTimeout(async () => {
      try {
        const url = `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
          query
        )}&limit=5&dedupe=1&normalizeaddress=1`;
        const res = await fetch(url);
        const data: ILocationIQSuggestion[] = await res.json();
        if (Array.isArray(data)) setFormSuggestions(data);
        else setFormSuggestions([]);
      } catch (err) {
        console.error("Form suggest error:", err);
        setFormSuggestions([]);
      }
    }, 300);
  };

  const selectFormSuggestion = (s: ILocationIQSuggestion) => {
    setFormAddress(s.display_name);
    setFormCoords({
      lat: parseFloat(s.lat),
      lng: parseFloat(s.lon),
    });
    setFormSuggestions([]);

    if (!mapInstance.current) return;
    L.marker([parseFloat(s.lat), parseFloat(s.lon)])
      .addTo(mapInstance.current)
      .bindPopup(s.display_name)
      .openPopup();
  };

  // ---------------- ADD LOCATION ----------------
  const addLocation = async () => {
    if (!formProject.trim() || !formAddress.trim()) {
      toast.warn("Please enter Project and Address.");
      return;
    }

    let coords = formCoords;

    if (!coords) {
      try {
        const url = `https://api.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
          formAddress
        )}&format=json&limit=1`;
        const res = await fetch(url);
        const data: ILocationIQSuggestion[] = await res.json();
        if (data.length) {
          coords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
        }
      } catch (err) {
        console.error("Geocode error:", err);
      }
    }

    let locationJson: string | null = null;
    if (coords) {
      locationJson = JSON.stringify({
        Street: formAddress,
        City: "",
        CountryOrRegion: "",
        PostalCode: "",
        State: "",
        Coordinates: {
          Latitude: coords.lat,
          Longitude: coords.lng,
          Altitude: 0,
        },
      });
    }

    try {
      await sp.web.lists.getByTitle("ProjectLocation").items.add({
        Project: formProject,
        Address: formAddress,
        Location: locationJson,
      });

      toast.success("Location added successfully!");
      setShowAddForm(false);
      setFormProject("");
      setFormAddress("");
      setFormCoords(null);
      setFormSuggestions([]);

      loadLocations();
    } catch (err) {
      console.error("Error adding item:", err);
      toast.error("Error adding item...");
    }
  };

  // ---------------- MANUAL DESTINATION SUGGESTIONS ----------------
  const fetchManualSuggestions = (query: string) => {
    if (!query || query.length < 3) {
      setManualSuggestions([]);
      return;
    }

    if (manualSuggestTimeout) clearTimeout(manualSuggestTimeout);

    manualSuggestTimeout = setTimeout(async () => {
      try {
        const url = `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
          query
        )}&limit=5&normalizeaddress=1`;
        const res = await fetch(url);
        const data: ILocationIQSuggestion[] = await res.json();
        if (Array.isArray(data)) setManualSuggestions(data);
        else setManualSuggestions([]);
      } catch (err) {
        console.error("Manual suggest error:", err);
        setManualSuggestions([]);
      }
    }, 300);
  };

  const selectManualSuggestion = (s: ILocationIQSuggestion) => {
    setManualDestination(s.display_name);
    setManualCoords({
      lat: parseFloat(s.lat),
      lng: parseFloat(s.lon),
    });
    setManualSuggestions([]);

    if (!mapInstance.current) return;
    L.marker([parseFloat(s.lat), parseFloat(s.lon)])
      .addTo(mapInstance.current)
      .bindPopup(s.display_name)
      .openPopup();
  };

  const geocodeManualDestination = async () => {
    if (!manualDestination.trim()) {
      toast.warn("Please type destination.");
      return;
    }

    try {
      const url = `https://api.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
        manualDestination
      )}&format=json&limit=1`;
      const res = await fetch(url);
      const data: ILocationIQSuggestion[] = await res.json();
      if (!data.length) {
        toast.info("Destination not found.");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setManualCoords({ lat, lng });

      if (!mapInstance.current) return;
      L.marker([lat, lng])
        .addTo(mapInstance.current)
        .bindPopup(manualDestination)
        .openPopup();
      mapInstance.current.setView([lat, lng], 14);
    } catch (err) {
      console.error("Manual geocode error:", err);
    }
  };

  const clearManualDestination = () => {
    setManualDestination("");
    setManualCoords(null);
    setManualSuggestions([]);
  };

  const clearDropdownDestination = () => {
    setDestinationId(null);
  };

  // ---------------- ROUTING EFFECT ----------------
  React.useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    try {
      if (
        !sourceId &&
        !destinationId &&
        !manualCoords &&
        !(sourceId === -1 && userLocation)
      ) {
        if (routingCtrl.current) {
          (map as any).removeControl(routingCtrl.current);
          routingCtrl.current = null;
        }
        setInfo("");
        return;
      }

      let srcLat: number | null = null;
      let srcLng: number | null = null;
      let dstLat: number | null = null;
      let dstLng: number | null = null;

      // SOURCE
      if (sourceId === -1 && userLocation) {
        srcLat = userLocation.lat;
        srcLng = userLocation.lng;
      } else if (sourceId !== null) {
        let srcItem: ILocationItem | null = null;
        for (const l of locations) {
          if (l.Id === sourceId) {
            srcItem = l;
            break;
          }
        }
        if (srcItem && srcItem.Lat != null && srcItem.Lng != null) {
          srcLat = srcItem.Lat;
          srcLng = srcItem.Lng;
        }
      }

      // DESTINATION
      if (manualCoords) {
        dstLat = manualCoords.lat;
        dstLng = manualCoords.lng;
      } else if (destinationId !== null) {
        let dstItem: ILocationItem | null = null;
        for (const l of locations) {
          if (l.Id === destinationId) {
            dstItem = l;
            break;
          }
        }
        if (dstItem && dstItem.Lat != null && dstItem.Lng != null) {
          dstLat = dstItem.Lat;
          dstLng = dstItem.Lng;
        }
      }

      if (
        srcLat === null ||
        srcLng === null ||
        dstLat === null ||
        dstLng === null
      ) {
        return;
      }

      if (routingCtrl.current) {
        (map as any).removeControl(routingCtrl.current);
        routingCtrl.current = null;
      }

      // @ts-ignore leaflet-routing-machine
     routingCtrl.current = (L as any).Routing.control({
  waypoints: [
    L.latLng(srcLat, srcLng),
    L.latLng(dstLat, dstLng),
  ],
  router: (L as any).Routing.osrmv1({
    serviceUrl: "https://router.project-osrm.org/route/v1",
  }),
  addWaypoints: false,
  show: false,
})
        .on("routesfound", (e: any) => {
          const r = e.routes[0];
          if (!r) return;
          const km = (r.summary.totalDistance / 1000).toFixed(2);
          const min = (r.summary.totalTime / 60).toFixed(1);
          setInfo(`Distance: ${km} km | Time: ${min} minutes`);
        })
        .addTo(map);
    } catch (err) {
      console.error("Routing error:", err);
    }
  }, [sourceId, destinationId, manualCoords, userLocation, locations]);

  // ---------------- CLICK LOCATION IN LIST ----------------
  const focusLocationOnMap = (loc: ILocationItem) => {
    if (!mapInstance.current || loc.Lat == null || loc.Lng == null) return;
    mapInstance.current.setView([loc.Lat, loc.Lng], 15);
    L.marker([loc.Lat, loc.Lng])
      .addTo(mapInstance.current)
      .bindPopup(`<b>${loc.Project}</b><br/>${loc.Address}`)
      .openPopup();
  };

  // ---- when project changes, clear selections & route ----
  React.useEffect(() => {
    setSourceId(null);
    setDestinationId(null);
    clearManualDestination();
    setInfo("");
  }, [selectedProject]);

  return (
    <div
      style={{
        fontFamily: "Segoe UI, sans-serif",
        padding: "20px",
        background: "#f5f5f5",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        gap: "25px",
      }}
    >
      <ToastContainer position="top-center" autoClose={2000} />

      {/* ======================= FULL-WIDTH FORM ========================= */}
      <div
        style={{
          width: "100%",
          background: "#fff",
          padding: "24px",
          borderRadius: "14px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* Title */}
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 600 }}>
          Find your Location
        </h2>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={useCurrentLocation}
            style={{
              flex: 1,
              padding: "14px",
              background: "#4285F4",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            📍 Use My Current Location
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            style={{
              flex: 1,
              padding: "14px",
              background: "#34A853",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            ➕ Add New Location
          </button>
        </div>

        {/* Project */}

        {/* Source */}
        <div>
          <label style={{ fontSize: "14px", fontWeight: 600 }}>Source</label>
          <select
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "15px",
            }}
            value={sourceId ?? ""}
            onChange={(e) =>
              setSourceId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Select Source</option>
            {userLocation && <option value={-1}>📍 My Current Location</option>}

            {filteredLocations.map((loc) => (
              <option key={loc.Id} value={loc.Id}>
                {loc.Project} — {loc.Address}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Dropdown */}
        <div>
          <label style={{ fontSize: "14px", fontWeight: 600 }}>
            Destination
          </label>

          <div style={{ display: "flex", gap: "8px" }}>
            <select
              disabled={manualDestinationActive}
              style={{
                flex: 1,
                padding: "12px",
                marginTop: "6px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "15px",
                width: "80%",
              }}
              value={destinationId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  setDestinationId(Number(val));
                  clearManualDestination();
                } else {
                  setDestinationId(null);
                }
              }}
            >
              <option value="">Select Destination</option>
              {filteredLocations.map((loc) => (
                <option key={loc.Id} value={loc.Id}>
                  {loc.Project} — {loc.Address}
                </option>
              ))}
            </select>

            <button
              onClick={clearDropdownDestination}
              disabled={!dropdownDestinationActive}
              style={{
                padding: "0 12px",
                borderRadius: "8px",
                marginTop: "6px",
                border: "1px solid #ccc",
                background: dropdownDestinationActive ? "#eee" : "#f9f9f9",
                cursor: dropdownDestinationActive ? "pointer" : "not-allowed",
              }}
            >
              ✖
            </button>
          </div>
        </div>

        {/* Manual Destination */}
        <div>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>
            OR enter custom destination:
          </span>

          <div style={{ marginTop: "6px", display: "flex", gap: "6px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                disabled={dropdownDestinationActive}
                value={manualDestination}
                onChange={(e) => {
                  setManualDestination(e.target.value);
                  setManualCoords(null);
                  setDestinationId(null);
                  fetchManualSuggestions(e.target.value);
                }}
                style={{
                  width: "95%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "15px",
                }}
                placeholder="Enter address"
              />

              {/* Suggestions */}
              {manualSuggestions.length > 0 && !dropdownDestinationActive && (
                <div
                  style={{
                    position: "absolute",
                    top: "46px",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    maxHeight: "180px",
                    overflowY: "auto",
                    zIndex: 9999,
                  }}
                >
                  {manualSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => selectManualSuggestion(s)}
                      style={{
                        padding: "10px",
                        fontSize: "14px",
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {s.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (manualDestination.trim()) {
                  geocodeManualDestination();
                }
                // dropdown destination routing already happens via useEffect
              }}
              disabled={!canGo}
              style={{
                padding: "0 16px",
                borderRadius: "8px",
                border: "none",
                background: canGo ? "#4285F4" : "#ccc",
                color: "#fff",
                cursor: canGo ? "pointer" : "not-allowed",
                fontSize: "15px",
                height: "48px",
              }}
            >
              Go
            </button>

            <button
              onClick={clearManualDestination}
              disabled={!manualDestinationActive}
              style={{
                padding: "0 14px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                background: manualDestinationActive ? "#eee" : "#f9f9f9",
                cursor: manualDestinationActive ? "pointer" : "not-allowed",
                height: "48px",
              }}
            >
              ✖
            </button>
          </div>
        </div>
        <div>
          <label style={{ fontSize: "14px", fontWeight: 600 }}>Project</label>
          <select
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "6px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "15px",
            }}
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projectNames.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Distance Info */}
        <p style={{ fontSize: "30px", color: "#34A853", marginTop: "4px" }}>
          {info || "Select source and destination to see route details"}
        </p>

        {/* Project Locations List */}
        <div style={{ marginTop: "10px" }}>
          <h3 style={{ margin: "0 0 8px 0" }}>Saved Locations in Project</h3>

          {filteredLocations.length === 0 ? (
            <p style={{ color: "#777", fontSize: "14px" }}>
              No locations found.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                border: "1px solid #eee",
                borderRadius: "10px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {filteredLocations.map((loc) => (
                <li
                  key={loc.Id}
                  onClick={() => focusLocationOnMap(loc)}
                  style={{
                    padding: "12px",
                    fontSize: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                  }}
                >
                  {loc.Address} <span>🔍</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ======================= LARGE MAP BELOW ========================= */}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "800px", // BIG MAP
          borderRadius: "14px",
          border: "1px solid #ccc",
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      />

      {/* ======================= ADD LOCATION MODAL ========================= */}
      {showAddForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "450px",
              background: "#fff",
              padding: "24px",
              borderRadius: "14px",
              boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Add New Location</h3>

            {/* Project */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontWeight: 600 }}>Project</label>
              <input
                style={{
                  width: "90%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  marginTop: "6px",
                }}
                value={formProject}
                onChange={(e) => setFormProject(e.target.value)}
              />
            </div>

            {/* Address */}
            <div style={{ marginBottom: "14px", position: "relative" }}>
              <label style={{ fontWeight: 600 }}>Address</label>
              <input
                style={{
                  width: "90%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  marginTop: "6px",
                }}
                value={formAddress}
                onChange={(e) => {
                  setFormAddress(e.target.value);
                  setFormCoords(null);
                  fetchFormSuggestions(e.target.value);
                }}
              />

              {formSuggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "48px",
                    left: 0,
                    right: 0,
                    border: "1px solid #ccc",
                    background: "#fff",
                    borderRadius: "8px",
                    maxHeight: "180px",
                    overflowY: "auto",
                    zIndex: 99999,
                  }}
                >
                  {formSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => selectFormSuggestion(s)}
                      style={{
                        padding: "10px",
                        fontSize: "14px",
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {s.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormProject("");
                  setFormAddress("");
                  setFormSuggestions([]);
                  setFormCoords(null);
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  background: "#eee",
                }}
              >
                Cancel
              </button>

              <button
                onClick={addLocation}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#34A853",
                  color: "#fff",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Save Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapIntegration;
