import * as React from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";

import styles from "./ProductChart.module.scss";
import { IProduct } from "./IProduct";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

type ChartType = "bar" | "pie" | "line";

export const ProductChart: React.FC = () => {
  const [products, setProducts] = React.useState<IProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = React.useState<IProduct[]>([]);

  const [labels, setLabels] = React.useState<string[]>([]);
  const [values, setValues] = React.useState<number[]>([]);

  const [categories, setCategories] = React.useState<string[]>(["all"]);
  const [brands, setBrands] = React.useState<string[]>(["all"]);

  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedBrand, setSelectedBrand] = React.useState<string>("all");
  const [ratingFilter, setRatingFilter] = React.useState<string>("all");
console.log("changes on 3rd dec");

  const [brandDisabled, setBrandDisabled] = React.useState<boolean>(false);
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  // dynamic rating buckets that are actually available
  const [availableRatings, setAvailableRatings] = React.useState<string[]>([
    "4plus",
    "3to4",
    "below3",
  ]);

  // KPI state
  const [totalProducts, setTotalProducts] = React.useState<number>(0);
  const [avgPrice, setAvgPrice] = React.useState<number>(0);
  const [maxPrice, setMaxPrice] = React.useState<number>(0);
  const [minPrice, setMinPrice] = React.useState<number>(0);
  const [avgRating, setAvgRating] = React.useState<number>(0);

  const [activeChart, setActiveChart] = React.useState<ChartType>("bar");

  // ---------- KPI UPDATE ----------
  function updateKPIs(items: IProduct[]): void {
    if (!items || items.length === 0) {
      setTotalProducts(0);
      setAvgPrice(0);
      setMaxPrice(0);
      setMinPrice(0);
      setAvgRating(0);
      return;
    }

    setTotalProducts(items.length);

    let sumPrice = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    let max = items[0].price;
    let min = items[0].price;

    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      sumPrice += p.price;

      if (p.price > max) max = p.price;
      if (p.price < min) min = p.price;

      if (typeof p.rating === "number") {
        ratingSum += p.rating;
        ratingCount++;
      }
    }

    setAvgPrice(Number((sumPrice / items.length).toFixed(2)));
    setMaxPrice(max);
    setMinPrice(min);
    setAvgRating(
      ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : 0
    );
  }

  // ---------- RATING FILTER ----------
  const applyRatingFilter = (
    items: IProduct[],
    filter: string
  ): IProduct[] => {
    if (filter === "all") return items;

    const result: IProduct[] = [];

    for (let i = 0; i < items.length; i++) {
      const r = items[i].rating || 0;

      if (filter === "4plus" && r >= 4) {
        result.push(items[i]);
      } else if (filter === "3to4" && r >= 3 && r < 4) {
        result.push(items[i]);
      } else if (filter === "below3" && r < 3) {
        result.push(items[i]);
      }
    }

    return result;
  };

  // compute what rating ranges actually exist for current filtered list
  function computeAvailableRatings(items: IProduct[]): void {
    let has4plus = false;
    let has3to4 = false;
    let hasBelow3 = false;

    for (let i = 0; i < items.length; i++) {
      const r = items[i].rating || 0;

      if (r >= 4) has4plus = true;
      else if (r >= 3 && r < 4) has3to4 = true;
      else if (r < 3) hasBelow3 = true;
    }

    const arr: string[] = [];
    if (has4plus) arr.push("4plus");
    if (has3to4) arr.push("3to4");
    if (hasBelow3) arr.push("below3");

    setAvailableRatings(arr);
  }

  // ---------- MAIN FILTER FUNCTION ----------
  const filterData = React.useCallback((): void => {
    if (!isLoaded) return;

    let filtered: IProduct[] = products.slice();

    // CATEGORY FILTER
    if (selectedCategory !== "all") {
      const catKey = selectedCategory.toLowerCase();
      filtered = filtered.filter((p) =>
        (p.category || "").toLowerCase() === catKey
      );
    }

    // BRAND FILTER
    if (!brandDisabled && selectedBrand !== "all") {
      const brandKey = selectedBrand.toLowerCase();
      filtered = filtered.filter((p) =>
        (p.brand || "").toLowerCase() === brandKey
      );
    }

    // RATING FILTER
    filtered = applyRatingFilter(filtered, ratingFilter);

    // KPIs + rating buckets + table + chart
    updateKPIs(filtered);
    computeAvailableRatings(filtered);
    setFilteredProducts(filtered);

    const lbls: string[] = [];
    const vals: number[] = [];
    for (let i = 0; i < filtered.length && i < 10; i++) {
      lbls.push(filtered[i].title);
      vals.push(filtered[i].price);
    }
    setLabels(lbls);
    setValues(vals);
  }, [products, selectedCategory, selectedBrand, ratingFilter, brandDisabled, isLoaded]);

  // ---------- FETCH DATA ----------
  async function fetchData(): Promise<void> {
    try {
      const response = await fetch("https://dummyjson.com/products?limit=100");
      const json = await response.json();
      const items: IProduct[] = json.products || [];

      setProducts(items);

      // Build categories (SPFx-safe, no Array.from)
      const categorySet = new Set<string>();
      for (let i = 0; i < items.length; i++) {
        if (items[i].category) {
          categorySet.add(items[i].category);
        }
      }
      const categoryArray: string[] = ["all"];
      categorySet.forEach((c) => categoryArray.push(c));
      setCategories(categoryArray);

      // Build brands (SPFx-safe)
      const brandSet = new Set<string>();
      for (let i = 0; i < items.length; i++) {
        if (items[i].brand) {
          brandSet.add(items[i].brand);
        }
      }
      const brandArray: string[] = ["all"];
      brandSet.forEach((b) => brandArray.push(b));
      setBrands(brandArray);
      setBrandDisabled(false);

      setIsLoaded(true);
    } catch (err) {
      console.error("Error fetching products:", err);
      setIsLoaded(true);
    }
  }

  // ---------- EFFECTS ----------

  // initial fetch
  React.useEffect(() => {
    void fetchData();
  }, []);

  // when products loaded or filters change → apply all filters
  React.useEffect(() => {
    if (!isLoaded) return;
    filterData();
  }, [isLoaded, products, selectedCategory, selectedBrand, ratingFilter, filterData]);

  // when category changes → rebuild brand list for that category
  React.useEffect(() => {
    if (!isLoaded || !products.length) return;

    let relevantProducts: IProduct[] = [];

    if (selectedCategory === "all") {
      relevantProducts = products;
    } else {
      const catKey = selectedCategory.toLowerCase();
      relevantProducts = products.filter(
        (p) => (p.category || "").toLowerCase() === catKey
      );
    }

    const brandSet = new Set<string>();
    for (let i = 0; i < relevantProducts.length; i++) {
      if (relevantProducts[i].brand) {
        brandSet.add(relevantProducts[i].brand);
      }
    }

    if (brandSet.size === 0) {
      setBrands(["all"]);
      setSelectedBrand("all");
      setBrandDisabled(true);
    } else {
      const brandArray: string[] = ["all"];
      brandSet.forEach((b) => brandArray.push(b));
      setBrands(brandArray);
      setSelectedBrand("all");
      setBrandDisabled(false);
    }

    // Reset rating whenever category/brand base changes
    setRatingFilter("all");
  }, [selectedCategory, products, isLoaded]);

  // ---------- CHART DATA ----------

  const barColors: string[] = [
    "#4F81BD",
    "#C0504D",
    "#9BBB59",
    "#8064A2",
    "#4BACC6",
    "#F79646",
    "#2E75B6",
    "#FF5C5C",
    "#3CB371",
    "#FFD700",
  ];

  const barData = {
    labels,
    datasets: [
      {
        label: "Product Prices",
        data: values,
        backgroundColor: values.map(
          (_v: number, index: number): string =>
            barColors[index % barColors.length]
        ),
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  };

  const pieData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: values.map(
          (_v: number, index: number): string =>
            barColors[index % barColors.length]
        ),
        borderWidth: 1,
      },
    ],
  };

  const lineData = {
    labels,
    datasets: [
      {
        label: "Price Trend",
        data: values,
        borderColor: "#0078d4",
        backgroundColor: "rgba(0,120,212,0.2)",
        tension: 0.3,
      },
    ],
  };

  // ---------- UI ----------
  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Product Dashboard</h1>
      <h3 className={styles.subTitle}>Interactive insights with filters</h3>

      {/* KPI Row */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Products</span>
          <span className={styles.kpiValue}>{totalProducts}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avg Price</span>
          <span className={styles.kpiValue}>${avgPrice}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Max Price</span>
          <span className={styles.kpiValue}>${maxPrice}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Min Price</span>
          <span className={styles.kpiValue}>${minPrice}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avg Rating</span>
          <span className={styles.kpiValue}>{avgRating}</span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        {/* Category */}
        <div className={styles.filterCard}>
          <label className={styles.filterLabel}>Category</label>
          <select
            className={styles.filterSelect}
            value={selectedCategory}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
              setSelectedCategory(e.target.value)
            }
          >
            {categories.map((c: string): JSX.Element => (
              <option key={c} value={c}>
                {(c || "ALL").toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div className={styles.filterCard}>
          <label className={styles.filterLabel}>Brand</label>
          <select
            className={styles.filterSelect}
            value={selectedBrand}
            disabled={brandDisabled}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
              setSelectedBrand(e.target.value)
            }
          >
            {brands.map((b: string): JSX.Element => (
              <option key={b} value={b}>
                {(b || "ALL").toUpperCase()}
              </option>
            ))}
          </select>
          {brandDisabled && (
            <span className={styles.hintText}>
              No brands available for this category
            </span>
          )}
        </div>

        {/* Rating */}
        <div className={styles.filterCard}>
          <label className={styles.filterLabel}>Rating</label>
          <select
            className={styles.filterSelect}
            value={ratingFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
              setRatingFilter(e.target.value)
            }
          >
            <option value="all">All Ratings</option>
            {availableRatings.indexOf("4plus") !== -1 && (
              <option value="4plus">4 ★ &amp; Above</option>
            )}
            {availableRatings.indexOf("3to4") !== -1 && (
              <option value="3to4">3 ★ – 3.9 ★</option>
            )}
            {availableRatings.indexOf("below3") !== -1 && (
              <option value="below3">Below 3 ★</option>
            )}
          </select>
        </div>
      </div>

      {/* Chart toggle buttons */}
      <div className={styles.chartToolbar}>
        <button
          type="button"
          className={
            activeChart === "bar"
              ? `${styles.chartButton} ${styles.chartButtonActive}`
              : styles.chartButton
          }
          onClick={(): void => setActiveChart("bar")}
        >
          Bar
        </button>
        <button
          type="button"
          className={
            activeChart === "pie"
              ? `${styles.chartButton} ${styles.chartButtonActive}`
              : styles.chartButton
          }
          onClick={(): void => setActiveChart("pie")}
        >
          Pie
        </button>
        <button
          type="button"
          className={
            activeChart === "line"
              ? `${styles.chartButton} ${styles.chartButtonActive}`
              : styles.chartButton
          }
          onClick={(): void => setActiveChart("line")}
        >
          Line
        </button>
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        {activeChart === "bar" && (
          <div className={styles.chartCard}>
            <Bar data={barData} options={barOptions} height={260} />
          </div>
        )}
        {activeChart === "pie" && (
          <div className={styles.chartCard}>
            <Pie data={pieData} height={260} />
          </div>
        )}
        {activeChart === "line" && (
          <div className={styles.chartCard}>
            <Line data={lineData} height={260} />
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.ratingsSection}>
        <h3 className={styles.sectionTitle}>Overview</h3>
        <div className={styles.tableContainer}>
          <table className={styles.productTable}>
            <thead>
              <tr>
                <th className={styles.tableHeader}>Product</th>
                <th className={styles.tableHeader}>Category</th>
                <th className={styles.tableHeader}>Brand</th>
                <th className={styles.tableHeader}>Price</th>
                <th className={styles.tableHeader}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p: IProduct): JSX.Element => (
                <tr key={p.id}>
                  <td className={styles.tableCell}>{p.title}</td>
                  <td className={styles.tableCell}>{p.category}</td>
                  <td className={styles.tableCell}>{p.brand}</td>
                  <td className={styles.tableCell}>${p.price}</td>
                  <td className={styles.tableCell}>
                    <span className={styles.ratingBadge}>
                      {p.rating?.toFixed(1)} ⭐
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
