import express from "express";
import { createServer as createViteServer } from "vite";
import yahooFinance from "yahoo-finance2";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize SQLite Database
const db = new Database(path.join(__dirname, "skynet.db"));
db.pragma("journal_mode = WAL");

// Setup tables
db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset TEXT NOT NULL,
    researcher_report TEXT,
    quant_report TEXT,
    risk_report TEXT,
    cio_report TEXT,
    recommendation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Fetch real financial data to feed to agents
  app.get("/api/finance/:ticker", async (req, res) => {
    try {
      const ticker = req.params.ticker;
      const quote: any = await yahooFinance.quote(ticker);
      const history: any = await yahooFinance.historical(ticker, { period1: "3mo", interval: "1d" });

      const recent = history.slice(-5);
      const priceChange5d = recent.length > 0 
        ? ((recent.at(-1)!.close - recent[0].close) / recent[0].close * 100).toFixed(2)
        : "N/A";

      const data = `
=== DATOS FINANCIEROS EN TIEMPO REAL (${ticker}) ===
Precio actual: $${quote.regularMarketPrice}
Cambio hoy: ${quote.regularMarketChangePercent?.toFixed(2)}%
Cambio 5 días: ${priceChange5d}%
Volumen: ${quote.regularMarketVolume?.toLocaleString()}
P/E Ratio: ${quote.trailingPE ?? 'N/A'}
Market Cap: $${((quote.marketCap ?? 0) / 1e9).toFixed(2)}B
52w High: $${quote.fiftyTwoWeekHigh} | 52w Low: $${quote.fiftyTwoWeekLow}
Analistas recomiendan: ${quote.averageAnalystRating ?? 'N/A'}
`;
      res.json({ data });
    } catch (error) {
      console.error("Finance API Error:", error);
      res.status(500).json({ error: "Failed to fetch financial data" });
    }
  });

  // History Routes
  app.post("/api/history", (req, res) => {
    try {
      const { asset, researcherReport, quantReport, riskReport, cioReport, recommendation } = req.body;
      const stmt = db.prepare(`
        INSERT INTO analysis_history (asset, researcher_report, quant_report, risk_report, cio_report, recommendation)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(asset, researcherReport, quantReport, riskReport, cioReport, recommendation);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to save history" });
    }
  });

  app.get("/api/history", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM analysis_history ORDER BY created_at DESC LIMIT 50");
      const rows = stmt.all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
