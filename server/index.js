// Runs the app on your computer or on hosts like Render: `npm start`.
// (On Vercel, api/index.js is used instead.)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import app, { connectDb, configProblem } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
if (configProblem) {
  console.error(configProblem);
  process.exit(1);
}

// never cache the app page, so phones always get the newest build after a deploy
const noCache = (res) =>
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
const dist = path.join(__dirname, "..", "dist");
app.use(
  express.static(dist, {
    setHeaders: (res, file) => {
      if (file.endsWith(".html")) noCache(res);
    },
  }),
);
app.get("*", (req, res) => {
  noCache(res);
  res.sendFile(path.join(dist, "index.html"));
});

connectDb()
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () =>
      console.log(`Lacquer Salon Book running on http://localhost:${PORT}`),
    );
  })
  .catch((e) => {
    console.error("Could not connect to MongoDB:", e.message);
    process.exit(1);
  });
