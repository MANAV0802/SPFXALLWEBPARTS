export function getAqiLabel(aqi: number) {
  switch (aqi) {
    case 1: return { text: "Good", color: "#2ecc71" };
    case 2: return { text: "Fair", color: "#f1c40f" };
    case 3: return { text: "Moderate", color: "#e67e22" };
    case 4: return { text: "Poor", color: "#e74c3c" };
    case 5: return { text: "Very Poor", color: "#8e44ad" };
    default: return { text: "Unknown", color: "#999" };
  }
}
