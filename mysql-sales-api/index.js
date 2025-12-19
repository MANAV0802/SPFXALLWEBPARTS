const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 🔌 MySQL connection
const pool = mysql.createPool({
  host: "localhost",
  user: "root",                   // 🔁 your MySQL user
  password: "Mkpatel@82", // 🔁 your MySQL password
  database: "SalesDB"             // our DB
});

// Test route
app.get("/", (req, res) => {
  res.send("MySQL Sales API is running!");
});


// 1️⃣ Monthly totals by month (already had this)
//    /sales?year=2024&region=North or region=All
app.get("/sales", async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year, 10) : 2024;
  const region = req.query.region || "All";

  try {
    let query = `
      SELECT month AS category, SUM(amount) AS value
      FROM MonthlySales
      WHERE year = ?
    `;
    const params = [year];

    if (region !== "All") {
      query += " AND region = ?";
      params.push(region);
    }

    query += `
      GROUP BY month
      ORDER BY FIELD(month,
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
      )
    `;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error while fetching sales data" });
  }
});


// 2️⃣ Product-wise totals
//    /sales/by-product?year=2024&region=North or region=All
app.get("/sales/by-product", async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year, 10) : 2024;
  const region = req.query.region || "All";

  try {
    let query = `
      SELECT
        COALESCE(product, 'Unknown') AS category,
        SUM(amount) AS value
      FROM MonthlySales
      WHERE year = ?
    `;
    const params = [year];

    if (region !== "All") {
      query += " AND region = ?";
      params.push(region);
    }

    query += " GROUP BY product";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error while fetching product-wise sales" });
  }
});


// 3️⃣ Month vs Region matrix
//    /sales/by-month-region?year=2024
//    (we always show all regions for that year)
app.get("/sales/by-month-region", async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year, 10) : 2024;

  try {
    let query = `
      SELECT
        month,
        region,
        SUM(amount) AS value
      FROM MonthlySales
      WHERE year = ?
      GROUP BY month, region
      ORDER BY FIELD(month,
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
      ), region
    `;

    const [rows] = await pool.query(query, [year]);
    res.json(rows); // [{month:'Jan', region:'North', value:...}, ...]
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error while fetching month-region data" });
  }
});


app.listen(port, () => {
  console.log(`MySQL Sales API listening on http://localhost:${port}`);
});
