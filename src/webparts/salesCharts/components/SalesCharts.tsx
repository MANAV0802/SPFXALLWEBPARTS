import * as React from "react";
import { useEffect, useState } from "react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

import styles from "./SalesCharts.module.scss";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

// Props from web part
export interface ISalesChartsProps {
  apiBaseUrl: string;
  defaultYear: string;
  defaultRegion: string;
  defaultChartType: string;
}

// Data shapes
interface IDataPoint {
  category: string; // month name for main chart
  value: any;       // may arrive as string from API
}

interface IProductPoint {
  category: string; // product name
  value: any;
}

interface IRegionMonthPoint {
  month: string;
  region: string;
  value: any;
}

interface IKpi {
  total: number;
  avg: number;
  bestMonth: string;
  bestValue: number;
}

type ChartType = "bar" | "line" | "pie";
type ViewMode = "monthly" | "product" | "region";

// ---- THEME COLORS ----
const mainPalette: string[] = [
  "#0078d4", // blue
  "#0099bc", // teal
  "#00b294", // green
  "#bad80a", // lime
  "#ff8c00", // orange
  "#e81123", // red
  "#b4009e", // magenta
  "#5c2d91", // purple
  "#69797e", // grey
  "#8e562e", // brown
  "#498205", // dark green
  "#00ae56"  // green 2
];

const lineFill = "rgba(0, 120, 212, 0.12)";

const STORAGE_KEY = "SalesChartsPreferences";

// helper: format big numbers nicely (e.g. 12345 -> 12.3K)
const formatNumber = (num: number): string => {
  if (!isFinite(num)) return "-";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return Math.round(num).toString();
};

// helper: safe numeric conversion
const toNumber = (value: any): number => {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

const SalesCharts: React.FC<ISalesChartsProps> = (props) => {
  // Main monthly data
  const [monthlyData, setMonthlyData] = useState<IDataPoint[]>([]);
  // Product-wise data
  const [productData, setProductData] = useState<IProductPoint[]>([]);
  // Region vs month matrix data
  const [regionMonthData, setRegionMonthData] = useState<IRegionMonthPoint[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Start from property pane defaults
  const [year, setYear] = useState<number>(parseInt(props.defaultYear || "2024", 10));
  const [region, setRegion] = useState<string>(props.defaultRegion || "All");
  const [chartType, setChartType] = useState<ChartType>(
    (props.defaultChartType as ChartType) || "bar"
  );
  const [view, setView] = useState<ViewMode>("monthly");

  // Load saved prefs from localStorage
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.year) {
          setYear(parsed.year);
        }
        if (parsed.region) {
          setRegion(parsed.region);
        }
        if (parsed.chartType) {
          setChartType(parsed.chartType);
        }
        if (parsed.view) {
          setView(parsed.view as ViewMode);
        }
      }
    } catch (e) {
      console.log("Could not load saved preferences:", e);
    }
  }, []);

  // Save prefs when changed
  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        return;
      }
      const toSave = { year, region, chartType, view };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.log("Could not save preferences:", e);
    }
  }, [year, region, chartType, view]);

  // Fetch all data when filters change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.append("year", year.toString());
        params.append("region", region);

        // 3 calls: monthly, by-product (with region), month-region (all regions)
        const [resMonthly, resProduct, resRegionMonth] = await Promise.all([
          fetch(props.apiBaseUrl + "/sales?" + params.toString()),
          fetch(props.apiBaseUrl + "/sales/by-product?" + params.toString()),
          fetch(props.apiBaseUrl + "/sales/by-month-region?year=" + year.toString())
        ]);

        if (!resMonthly.ok) {
          throw new Error("Monthly API error: " + resMonthly.statusText);
        }
        if (!resProduct.ok) {
          throw new Error("Product API error: " + resProduct.statusText);
        }
        if (!resRegionMonth.ok) {
          throw new Error("RegionMonth API error: " + resRegionMonth.statusText);
        }

        const monthlyJson: IDataPoint[] = await resMonthly.json();
        const productJson: IProductPoint[] = await resProduct.json();
        const regionMonthJson: IRegionMonthPoint[] = await resRegionMonth.json();

        setMonthlyData(monthlyJson);
        setProductData(productJson);
        setRegionMonthData(regionMonthJson);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Error while loading data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [year, region, props.apiBaseUrl]);

  // ===== KPI calculations from monthly data =====
  const kpi: IKpi | null = React.useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return null;
    }

    let total = 0;
    let best = monthlyData[0];
    let bestVal = toNumber(best.value);

    for (let i = 0; i < monthlyData.length; i++) {
      const d = monthlyData[i];
      const v = toNumber(d.value);
      total += v;
      if (v > bestVal) {
        best = d;
        bestVal = v;
      }
    }

    const avg = total / monthlyData.length;

    return {
      total,
      avg,
      bestMonth: best.category,
      bestValue: bestVal
    };
  }, [monthlyData]);

  // ===== Chart data: Monthly =====
  const monthlyChartData = React.useMemo(() => {
    const labels = monthlyData.map((d: IDataPoint) => d.category);
    const values = monthlyData.map((d: IDataPoint) => toNumber(d.value));

    const pointColors: string[] = [];
    for (let i = 0; i < values.length; i++) {
      pointColors.push(mainPalette[i % mainPalette.length]);
    }

    const dataset: any = {
      label: "Monthly Sales " + year.toString() + " (" + region + ")",
      data: values,
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6
    };

    if (chartType === "pie") {
      dataset.backgroundColor = pointColors;
      dataset.borderColor = "#ffffff";
    } else if (chartType === "line") {
      dataset.borderColor = "#0078d4";
      dataset.backgroundColor = lineFill;
      dataset.pointBackgroundColor = pointColors;
      dataset.pointBorderColor = "#ffffff";
    } else {
      dataset.backgroundColor = pointColors;
      dataset.borderColor = "#ffffff";
    }

    return {
      labels,
      datasets: [dataset]
    };
  }, [monthlyData, year, region, chartType]);

  // ===== Chart data: Product (Pie) =====
  const productChartData = React.useMemo(() => {
    const labels = productData.map((d: IProductPoint) => d.category);
    const values = productData.map((d: IProductPoint) => toNumber(d.value));

    const sliceColors: string[] = [];
    for (let i = 0; i < values.length; i++) {
      sliceColors.push(mainPalette[i % mainPalette.length]);
    }

    return {
      labels,
      datasets: [
        {
          label: "Sales by Product " + year.toString() + " (" + region + ")",
          data: values,
          backgroundColor: sliceColors,
          borderColor: "#ffffff",
          borderWidth: 1
        }
      ]
    };
  }, [productData, year, region]);

  // ===== Chart data: Region vs Month (grouped bar) =====
  const regionMonthChartData = React.useMemo(() => {
    if (!regionMonthData || regionMonthData.length === 0) {
      return { labels: [], datasets: [] };
    }

    const monthOrder: string[] = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];

    const labels: string[] = [];
    for (let i = 0; i < monthOrder.length; i++) {
      const m: string = monthOrder[i];
      const hasMonth = regionMonthData.some((r: IRegionMonthPoint) => r.month === m);
      if (hasMonth) {
        labels.push(m);
      }
    }

    const regions: string[] = [];
    for (let j = 0; j < regionMonthData.length; j++) {
      const rm: IRegionMonthPoint = regionMonthData[j];
      if (regions.indexOf(rm.region) === -1) {
        regions.push(rm.region);
      }
    }

    const datasets = regions.map((regionName: string, index: number) => {
      const values: number[] = [];

      for (let i = 0; i < labels.length; i++) {
        const month: string = labels[i];
        let value = 0;

        for (let k = 0; k < regionMonthData.length; k++) {
          const row: IRegionMonthPoint = regionMonthData[k];
          if (row.month === month && row.region === regionName) {
            value = toNumber(row.value);
            break;
          }
        }

        values.push(value);
      }

      return {
        label: regionName,
        data: values,
        backgroundColor: mainPalette[index % mainPalette.length],
        borderColor: "#ffffff",
        borderWidth: 1
      };
    });

    return {
      labels,
      datasets
    };
  }, [regionMonthData]);

  // Common options
  const commonOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: "#323130",
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#605e5c"
        },
        grid: {
          color: "rgba(0,0,0,0.05)"
        }
      },
      y: {
        ticks: {
          color: "#605e5c"
        },
        grid: {
          color: "rgba(0,0,0,0.05)"
        }
      }
    }
  };

  const renderCurrentChart = () => {
    if (view === "monthly") {
      if (chartType === "bar") {
        return <Bar data={monthlyChartData} options={commonOptions} />;
      }
      if (chartType === "line") {
        return <Line data={monthlyChartData} options={commonOptions} />;
      }
      return <Pie data={monthlyChartData} options={commonOptions} />;
    }

    if (view === "product") {
      return <Pie data={productChartData} options={commonOptions} />;
    }

    // view === "region"
    return <Bar data={regionMonthChartData} options={commonOptions} />;
  };

  const currentTitle =
    view === "monthly"
      ? "Monthly Sales"
      : view === "product"
      ? "Sales by Product"
      : "Region vs Month (all regions)";

  // key so chart wrapper remounts -> fade animation plays on view / chart change
  const chartKey = `${view}_${chartType}_${year}_${region}`;

  return (
    <div className={styles.salesCharts}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Manav&apos;s MySQL Sales Dashboard</div>
          <div className={styles.subtitle}>
            Monthly · Product-wise · Region vs Month
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        <div className={styles.filterGroup}>
          <span className={styles.label}>Year:</span>
          <select
            className={styles.select}
            value={year}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setYear(parseInt(e.target.value, 10))
            }
          >
            <option value={2023}>2023</option>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.label}>Region (for 2 charts):</span>
          <select
            className={styles.select}
            value={region}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setRegion(e.target.value)
            }
          >
            <option value="All">All</option>
            <option value="North">North</option>
            <option value="South">South</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.label}>Main chart type:</span>
          <select
            className={styles.select}
            value={chartType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setChartType(e.target.value as ChartType)
            }
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </select>
        </div>
      </div>

      {/* Status */}
      {loading && (
        <div className={styles.statusMessage}>Loading data...</div>
      )}
      {error && (
        <div className={styles.statusMessage + " " + styles.error}>
          Error: {error}
        </div>
      )}
      {!loading && !error && monthlyData.length === 0 && (
        <div className={styles.statusMessage}>
          No data found for the selected filters.
        </div>
      )}

      {/* Content */}
      {!loading && !error && monthlyData.length > 0 && (
        <>
          {/* KPI row */}
          {kpi && (
            <div className={styles.kpiRow}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Total Sales</div>
                <div className={styles.kpiValue}>
                  {formatNumber(kpi.total)}
                </div>
                <div className={styles.kpiSub}>Year {year}</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Avg / Month</div>
                <div className={styles.kpiValue}>
                  {formatNumber(kpi.avg)}
                </div>
                <div className={styles.kpiSub}>
                  Based on {monthlyData.length} months
                </div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Best Month</div>
                <div className={styles.kpiValue}>{kpi.bestMonth}</div>
                <div className={styles.kpiSub}>
                  {formatNumber(kpi.bestValue)}
                </div>
              </div>
            </div>
          )}

          {/* View selector tabs */}
          <div className={styles.viewTabs}>
            <button
              className={
                view === "monthly"
                  ? styles.viewTabButtonActive
                  : styles.viewTabButton
              }
              onClick={() => setView("monthly")}
            >
              <span className={styles.viewTabIcon}>📅</span>
              <span>Monthly</span>
            </button>
            <button
              className={
                view === "product"
                  ? styles.viewTabButtonActive
                  : styles.viewTabButton
              }
              onClick={() => setView("product")}
            >
              <span className={styles.viewTabIcon}>📦</span>
              <span>By Product</span>
            </button>
            <button
              className={
                view === "region"
                  ? styles.viewTabButtonActive
                  : styles.viewTabButton
              }
              onClick={() => setView("region")}
            >
              <span className={styles.viewTabIcon}>🌍</span>
              <span>Region vs Month</span>
            </button>
          </div>

          {/* Chart title just under tabs */}
          <div className={styles.chartTitle}>{currentTitle}</div>

          {/* Chart container with fade animation */}
          <div
            key={chartKey}
            className={`${styles.chartContainer} ${styles.chartFadeIn}`}
          >
            {renderCurrentChart()}
          </div>
        </>
      )}
    </div>
  );
};

export default SalesCharts;
