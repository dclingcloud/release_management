import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initialMajorVersions, initialSubVersions } from "./src/initialData";
import { MajorVersion, SubVersion } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Ensure db directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface Database {
  majorVersions: MajorVersion[];
  subVersions: SubVersion[];
}

function readDb(): Database {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: Database = {
      majorVersions: initialMajorVersions,
      subVersions: initialSubVersions,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
    return initialDb;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, using empty/fallback database", err);
    return { majorVersions: [], subVersions: [] };
  }
}

function writeDb(db: Database) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// API Routes
// 1. Major Versions
app.get("/api/major-versions", (req, res) => {
  const db = readDb();
  res.json(db.majorVersions);
});

app.post("/api/major-versions", (req, res) => {
  const db = readDb();
  const newVer = req.body as MajorVersion;
  
  if (!newVer.id) {
    newVer.id = "m_" + Date.now();
  }
  
  db.majorVersions.push(newVer);
  writeDb(db);
  res.status(201).json(newVer);
});

app.put("/api/major-versions/:id", (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const updatedVer = req.body as MajorVersion;
  
  const index = db.majorVersions.findIndex(v => v.id === id);
  if (index !== -1) {
    const oldVersionNumber = db.majorVersions[index].versionNumber;
    db.majorVersions[index] = { ...db.majorVersions[index], ...updatedVer };
    
    // Cascading update sub-versions' denormalized parent majorVersionNumber
    if (oldVersionNumber !== updatedVer.versionNumber) {
      db.subVersions = db.subVersions.map(s => {
        if (s.majorVersionId === id) {
          return { ...s, majorVersionNumber: updatedVer.versionNumber };
        }
        return s;
      });
    }
    
    writeDb(db);
    res.json(db.majorVersions[index]);
  } else {
    res.status(404).json({ error: "Major version not found" });
  }
});

app.delete("/api/major-versions/:id", (req, res) => {
  const db = readDb();
  const { id } = req.params;
  
  db.majorVersions = db.majorVersions.filter(v => v.id !== id);
  // Also clean up sub versions belonging to this major version
  db.subVersions = db.subVersions.filter(s => s.majorVersionId !== id);
  
  writeDb(db);
  res.json({ message: "Deleted successfully" });
});

// 2. Sub Versions
app.get("/api/sub-versions", (req, res) => {
  const db = readDb();
  res.json(db.subVersions);
});

app.post("/api/sub-versions", (req, res) => {
  const db = readDb();
  const newSub = req.body as SubVersion;
  
  if (!newSub.id) {
    newSub.id = "s_" + Date.now();
  }
  
  db.subVersions.push(newSub);
  writeDb(db);
  res.status(201).json(newSub);
});

app.put("/api/sub-versions/:id", (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const updatedSub = req.body as SubVersion;
  
  const index = db.subVersions.findIndex(s => s.id === id);
  if (index !== -1) {
    db.subVersions[index] = { ...db.subVersions[index], ...updatedSub };
    writeDb(db);
    res.json(db.subVersions[index]);
  } else {
    res.status(404).json({ error: "Sub version not found" });
  }
});

app.delete("/api/sub-versions/:id", (req, res) => {
  const db = readDb();
  const { id } = req.params;
  
  db.subVersions = db.subVersions.filter(s => s.id !== id);
  writeDb(db);
  res.json({ message: "Deleted successfully" });
});

// Reset database to default mock data
app.post("/api/reset", (req, res) => {
  const initialDb: Database = {
    majorVersions: initialMajorVersions,
    subVersions: initialSubVersions,
  };
  writeDb(initialDb);
  res.json({ message: "Reset successfully", majorVersions: initialMajorVersions, subVersions: initialSubVersions });
});

// Import bulk database data
app.post("/api/import", (req, res) => {
  const { majorVersions, subVersions } = req.body;
  if (Array.isArray(majorVersions) && Array.isArray(subVersions)) {
    const newDb: Database = { majorVersions, subVersions };
    writeDb(newDb);
    res.json({ message: "Imported successfully", ...newDb });
  } else {
    res.status(400).json({ error: "Invalid import format" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
