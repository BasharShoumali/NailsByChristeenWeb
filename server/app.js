// Lacquer Salon Book: the /api routes and MongoDB models.
// Used by server/index.js (computer, Render) and api/index.js (Vercel).
import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, "..", ".env"));

const {
  MONGODB_URI,
  OWNER_NAME = "Christeen",
  OWNER_PASSWORD,
  SESSION_SECRET = OWNER_PASSWORD
    ? crypto
        .createHash("sha256")
        .update("lacquer:" + OWNER_PASSWORD)
        .digest("hex")
    : "",
} = process.env;

export const configProblem = !MONGODB_URI
  ? "Missing MONGODB_URI. Add your MongoDB connection string to .env (or your host’s environment variables)."
  : !OWNER_PASSWORD
    ? `Missing OWNER_PASSWORD. Set a password for ${OWNER_NAME} in .env (or your host’s environment variables).`
    : null;

// One shared connection, reused between requests (important on Vercel).
let connecting = null;
export function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      .catch((e) => {
        connecting = null;
        throw e;
      });
  }
  return connecting;
}

// ---------- Models ----------
const opts = { versionKey: false, timestamps: true };
const Client = mongoose.model(
  "Client",
  new mongoose.Schema(
    {
      _id: String,
      name: { type: String, required: true, trim: true },
      phone: String,
      birthday: String,
      notes: String,
      createdAt: String,
    },
    { ...opts, timestamps: { createdAt: "created", updatedAt: "updated" } },
  ),
);

const Appointment = mongoose.model(
  "Appointment",
  new mongoose.Schema(
    {
      _id: String,
      clientId: { type: String, index: true },
      clientName: String,
      serviceIds: [String],
      date: { type: String, index: true },
      start: String,
      duration: Number,
      price: Number,
      tip: Number,
      status: {
        type: String,
        enum: ["booked", "done", "noshow", "cancelled"],
        default: "booked",
      },
      payment: String,
      notes: String,
    },
    opts,
  ),
);

const Service = mongoose.model(
  "Service",
  new mongoose.Schema(
    {
      _id: String,
      name: { type: String, required: true },
      duration: Number,
      price: Number,
      color: String,
    },
    opts,
  ),
);

const Settings = mongoose.model(
  "Settings",
  new mongoose.Schema(
    {
      _id: String,
      ownerName: String,
      salonName: String,
      currency: String,
      dayStart: String,
      dayEnd: String,
      weekStart: Number,
      started: Boolean,
    },
    opts,
  ),
);

const COLS = { clients: Client, appts: Appointment, services: Service };
const FIELDS = {
  clients: ["name", "phone", "birthday", "notes", "createdAt"],
  appts: [
    "clientId",
    "clientName",
    "serviceIds",
    "date",
    "start",
    "duration",
    "price",
    "tip",
    "status",
    "payment",
    "notes",
  ],
  services: ["name", "duration", "price", "color"],
  settings: [
    "ownerName",
    "salonName",
    "currency",
    "dayStart",
    "dayEnd",
    "weekStart",
    "started",
  ],
};
const pick = (obj, keys) =>
  Object.fromEntries(
    keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]),
  );
const out = (doc) => {
  if (!doc) return null;
  const { _id, createdAt, updatedAt, created, updated, ...rest } = doc;
  return {
    id: _id,
    ...rest,
    ...(createdAt && typeof createdAt === "string" ? { createdAt } : {}),
  };
};

// ---------- Session (signed cookie, 60 days) ----------
const sign = (v) =>
  crypto.createHmac("sha256", SESSION_SECRET).update(v).digest("base64url");
const makeToken = () => {
  const exp = Date.now() + 60 * 864e5;
  return `${exp}.${sign("owner." + exp)}`;
};
const validToken = (t) => {
  if (!t) return false;
  const [exp, sig] = t.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign("owner." + exp);
  return (
    sig.length === good.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))
  );
};
const cookieOf = (req, name) =>
  (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1];
const secure = (req) =>
  req.secure || req.headers["x-forwarded-proto"] === "https";
const setCookie = (req, res, val, maxAge) =>
  res.setHeader(
    "Set-Cookie",
    `lacquer_session=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(req) ? "; Secure" : ""}`,
  );

const attempts = new Map(); // simple brute-force brake per IP
function tooMany(ip) {
  const now = Date.now();
  const a = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60e3);
  attempts.set(ip, a);
  return a.length >= 10;
}

// ---------- App ----------
const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "5mb" }));
app.use("/api", (req, res, next) => {
  if (configProblem) {
    console.error(configProblem);
    return res.status(500).json({ error: configProblem });
  }
  next();
});

app.get("/api/session", (req, res) =>
  res.json({
    app: "lacquer",
    owner: OWNER_NAME,
    authed: validToken(cookieOf(req, "lacquer_session")),
  }),
);

app.post("/api/login", (req, res) => {
  const ip = req.ip;
  if (tooMany(ip))
    return res
      .status(429)
      .json({ error: "Too many tries. Wait 15 minutes and try again." });
  const given = Buffer.from(String(req.body?.password || ""));
  const real = Buffer.from(OWNER_PASSWORD);
  if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    attempts.get(ip).push(Date.now());
    return res.status(401).json({ error: "That password isn’t right." });
  }
  attempts.delete(ip);
  setCookie(req, res, makeToken(), 60 * 86400);
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  setCookie(req, res, "", 0);
  res.json({ ok: true });
});

app.use("/api", (req, res, next) =>
  validToken(cookieOf(req, "lacquer_session"))
    ? next()
    : res.status(401).json({ error: "Please sign in." }),
);
app.use("/api", (req, res, next) =>
  connectDb().then(
    () => next(),
    (e) => {
      console.error("Could not connect to MongoDB:", e.message);
      res.status(503).json({ error: "Can’t reach the database right now." });
    },
  ),
);

app.get("/api/book", async (req, res, next) => {
  try {
    const [settings, clients, appts, services] = await Promise.all([
      Settings.findById("salon").lean(),
      Client.find().lean(),
      Appointment.find().lean(),
      Service.find().lean(),
    ]);
    res.json({
      settings: settings ? out(settings) : null,
      clients: clients.map(out),
      appts: appts.map(out),
      services: services.map(out),
    });
  } catch (e) {
    next(e);
  }
});

app.put("/api/settings", async (req, res, next) => {
  try {
    const doc = await Settings.findByIdAndUpdate(
      "salon",
      pick(req.body || {}, FIELDS.settings),
      { upsert: true, new: true, lean: true },
    );
    res.json(out(doc));
  } catch (e) {
    next(e);
  }
});

app.put("/api/:col/:id", async (req, res, next) => {
  const Model = COLS[req.params.col];
  if (!Model) return res.status(404).json({ error: "Unknown collection" });
  try {
    const doc = await Model.findOneAndReplace(
      { _id: req.params.id },
      { _id: req.params.id, ...pick(req.body || {}, FIELDS[req.params.col]) },
      { upsert: true, new: true, lean: true, runValidators: true },
    );
    res.json(out(doc));
  } catch (e) {
    next(e);
  }
});

app.delete("/api/:col/:id", async (req, res, next) => {
  const Model = COLS[req.params.col];
  if (!Model) return res.status(404).json({ error: "Unknown collection" });
  try {
    await Model.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.name === "ValidationError" ? 400 : 500)
    .json({
      error: err.name === "ValidationError" ? err.message : "Server error",
    });
});

export default app;

function loadEnv(file) {
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined)
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch (e) {
    /* no .env file: use real environment variables */
  }
}
