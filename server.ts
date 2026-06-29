import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import { initialMajorVersions, initialSubVersions } from "./src/initialData";
import { MajorVersion, SubVersion } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const DB_DIR = path.join(process.cwd(), "data");

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, "db.sqlite");
const db = new Database(DB_PATH);

// Create tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS major_versions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    versionNumber TEXT NOT NULL,
    priority INTEGER NOT NULL,
    status TEXT NOT NULL,
    stage TEXT NOT NULL,
    releaseDate TEXT NOT NULL,
    owner TEXT NOT NULL,
    meetingMinutes TEXT,
    nextStageRDDDL TEXT,
    nextStageQADDL TEXT,
    details TEXT,
    ftpUrl TEXT,
    aiReview TEXT
  );
  
  CREATE TABLE IF NOT EXISTS sub_versions (
    id TEXT PRIMARY KEY,
    majorVersionId TEXT NOT NULL,
    majorVersionNumber TEXT NOT NULL,
    subVersionNumber TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    buildDate TEXT NOT NULL,
    branch TEXT NOT NULL,
    componentVersion TEXT NOT NULL,
    imageName TEXT NOT NULL,
    buildLink TEXT NOT NULL,
    buildLinkUrl TEXT,
    jenkinsStatus TEXT DEFAULT 'idle',
    jenkinsBuildLog TEXT,
    ftpUrl TEXT,
    warVersion TEXT,
    jarVersion TEXT,
    frontendVersion TEXT,
    backendVersion TEXT,
    vprobeVersion TEXT,
    scriptVersion TEXT,
    bpmVersion TEXT
  );
`);

// Safe migrations for newly added columns
try {
  db.exec("ALTER TABLE major_versions ADD COLUMN ftpUrl TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE major_versions ADD COLUMN aiReview TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN jenkinsStatus TEXT DEFAULT 'idle';");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN jenkinsBuildLog TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN ftpUrl TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN warVersion TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN jarVersion TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN frontendVersion TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN backendVersion TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN vprobeVersion TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN scriptVersion TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE sub_versions ADD COLUMN bpmVersion TEXT;");
} catch (e) {}

// Initialize default data if tables are empty
const countMajor = db.prepare("SELECT COUNT(*) as count FROM major_versions").get() as { count: number };
if (countMajor.count === 0) {
  const insertMajor = db.prepare(`
    INSERT INTO major_versions (
      id, type, versionNumber, priority, status, stage, releaseDate, owner, meetingMinutes, nextStageRDDDL, nextStageQADDL, details, ftpUrl, aiReview
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertSub = db.prepare(`
    INSERT INTO sub_versions (
      id, majorVersionId, majorVersionNumber, subVersionNumber, status, description, buildDate, branch, componentVersion, imageName, buildLink, buildLinkUrl, jenkinsStatus, jenkinsBuildLog, ftpUrl, warVersion, jarVersion, frontendVersion, backendVersion, vprobeVersion, scriptVersion, bpmVersion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    for (const v of initialMajorVersions) {
      insertMajor.run(
        v.id,
        v.type,
        v.versionNumber,
        v.priority,
        v.status,
        v.stage,
        v.releaseDate,
        v.owner,
        v.meetingMinutes || null,
        v.nextStageRDDDL || null,
        v.nextStageQADDL || null,
        v.details || null,
        null,
        null
      );
    }
    for (const s of initialSubVersions) {
      insertSub.run(
        s.id,
        s.majorVersionId,
        s.majorVersionNumber,
        s.subVersionNumber,
        s.status,
        s.description,
        s.buildDate,
        s.branch,
        s.componentVersion,
        s.imageName,
        '',
        null,
        'idle',
        null,
        null,
        s.warVersion || null,
        s.jarVersion || null,
        s.frontendVersion || null,
        s.backendVersion || null,
        s.vprobeVersion || null,
        s.scriptVersion || null,
        s.bpmVersion || null
      );
    }
  });
  
  transaction();
}

// API Routes
// 1. Major Versions
app.get("/api/major-versions", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM major_versions").all() as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/major-versions", (req, res) => {
  try {
    const newVer = req.body as MajorVersion;
    if (!newVer.id) {
      newVer.id = "m_" + Date.now();
    }
    
    db.prepare(`
      INSERT INTO major_versions (
        id, type, versionNumber, priority, status, stage, releaseDate, owner, meetingMinutes, nextStageRDDDL, nextStageQADDL, details, ftpUrl, aiReview
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newVer.id,
      newVer.type,
      newVer.versionNumber,
      newVer.priority,
      newVer.status,
      newVer.stage,
      newVer.releaseDate,
      newVer.owner,
      newVer.meetingMinutes || null,
      newVer.nextStageRDDDL || null,
      newVer.nextStageQADDL || null,
      newVer.details || null,
      newVer.ftpUrl || null,
      newVer.aiReview || null
    );
    
    res.status(201).json(newVer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/major-versions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updatedVer = req.body as MajorVersion;
    
    const existing = db.prepare("SELECT * FROM major_versions WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: "Version not found" });
    }
    
    const runUpdate = db.transaction(() => {
      db.prepare(`
        UPDATE major_versions SET
          type = ?,
          versionNumber = ?,
          priority = ?,
          status = ?,
          stage = ?,
          releaseDate = ?,
          owner = ?,
          meetingMinutes = ?,
          nextStageRDDDL = ?,
          nextStageQADDL = ?,
          details = ?,
          ftpUrl = ?,
          aiReview = ?
        WHERE id = ?
      `).run(
        updatedVer.type,
        updatedVer.versionNumber,
        updatedVer.priority,
        updatedVer.status,
        updatedVer.stage,
        updatedVer.releaseDate,
        updatedVer.owner,
        updatedVer.meetingMinutes || null,
        updatedVer.nextStageRDDDL || null,
        updatedVer.nextStageQADDL || null,
        updatedVer.details || null,
        updatedVer.ftpUrl || null,
        updatedVer.aiReview || null,
        id
      );
      
      if (existing.versionNumber !== updatedVer.versionNumber) {
        db.prepare("UPDATE sub_versions SET majorVersionNumber = ? WHERE majorVersionId = ?").run(
          updatedVer.versionNumber,
          id
        );
      }
    });
    
    runUpdate();
    res.json({ ...existing, ...updatedVer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/major-versions/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    const runDelete = db.transaction(() => {
      db.prepare("DELETE FROM major_versions WHERE id = ?").run(id);
      db.prepare("DELETE FROM sub_versions WHERE majorVersionId = ?").run(id);
    });
    
    runDelete();
    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Sub Versions
app.get("/api/sub-versions", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM sub_versions").all() as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sub-versions", (req, res) => {
  try {
    const newSub = req.body as SubVersion;
    if (!newSub.id) {
      newSub.id = "s_" + Date.now();
    }
    
    db.prepare(`
      INSERT INTO sub_versions (
        id, majorVersionId, majorVersionNumber, subVersionNumber, status, description, buildDate, branch, componentVersion, imageName, buildLink, buildLinkUrl, jenkinsStatus, jenkinsBuildLog, ftpUrl, warVersion, jarVersion, frontendVersion, backendVersion, vprobeVersion, scriptVersion, bpmVersion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newSub.id,
      newSub.majorVersionId,
      newSub.majorVersionNumber,
      newSub.subVersionNumber,
      newSub.status,
      newSub.description,
      newSub.buildDate,
      newSub.branch,
      newSub.componentVersion,
      newSub.imageName,
      '',
      null,
      newSub.jenkinsStatus || 'idle',
      newSub.jenkinsBuildLog || null,
      null,
      newSub.warVersion || null,
      newSub.jarVersion || null,
      newSub.frontendVersion || null,
      newSub.backendVersion || null,
      newSub.vprobeVersion || null,
      newSub.scriptVersion || null,
      newSub.bpmVersion || null
    );
    
    res.status(201).json(newSub);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/sub-versions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updatedSub = req.body as SubVersion;
    
    const existing = db.prepare("SELECT * FROM sub_versions WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: "Sub version not found" });
    }
    
    db.prepare(`
      UPDATE sub_versions SET
        majorVersionId = ?,
        majorVersionNumber = ?,
        subVersionNumber = ?,
        status = ?,
        description = ?,
        buildDate = ?,
        branch = ?,
        componentVersion = ?,
        imageName = ?,
        buildLink = ?,
        buildLinkUrl = ?,
        jenkinsStatus = ?,
        jenkinsBuildLog = ?,
        ftpUrl = ?,
        warVersion = ?,
        jarVersion = ?,
        frontendVersion = ?,
        backendVersion = ?,
        vprobeVersion = ?,
        scriptVersion = ?,
        bpmVersion = ?
      WHERE id = ?
    `).run(
      updatedSub.majorVersionId,
      updatedSub.majorVersionNumber,
      updatedSub.subVersionNumber,
      updatedSub.status,
      updatedSub.description,
      updatedSub.buildDate,
      updatedSub.branch,
      updatedSub.componentVersion,
      updatedSub.imageName,
      '',
      null,
      updatedSub.jenkinsStatus || 'idle',
      updatedSub.jenkinsBuildLog || null,
      null,
      updatedSub.warVersion || null,
      updatedSub.jarVersion || null,
      updatedSub.frontendVersion || null,
      updatedSub.backendVersion || null,
      updatedSub.vprobeVersion || null,
      updatedSub.scriptVersion || null,
      updatedSub.bpmVersion || null,
      id
    );
    
    res.json({ ...existing, ...updatedSub });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/sub-versions/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM sub_versions WHERE id = ?").run(id);
    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset database to default mock data
app.post("/api/reset", (req, res) => {
  try {
    const runReset = db.transaction(() => {
      db.prepare("DELETE FROM major_versions").run();
      db.prepare("DELETE FROM sub_versions").run();
      
      const insertMajor = db.prepare(`
        INSERT INTO major_versions (
          id, type, versionNumber, priority, status, stage, releaseDate, owner, meetingMinutes, nextStageRDDDL, nextStageQADDL, details, ftpUrl, aiReview
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertSub = db.prepare(`
        INSERT INTO sub_versions (
          id, majorVersionId, majorVersionNumber, subVersionNumber, status, description, buildDate, branch, componentVersion, imageName, buildLink, buildLinkUrl, jenkinsStatus, jenkinsBuildLog, ftpUrl, warVersion, jarVersion, frontendVersion, backendVersion, vprobeVersion, scriptVersion, bpmVersion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const v of initialMajorVersions) {
        insertMajor.run(
          v.id,
          v.type,
          v.versionNumber,
          v.priority,
          v.status,
          v.stage,
          v.releaseDate,
          v.owner,
          v.meetingMinutes || null,
          v.nextStageRDDDL || null,
          v.nextStageQADDL || null,
          v.details || null,
          null,
          null
        );
      }
      for (const s of initialSubVersions) {
        insertSub.run(
          s.id,
          s.majorVersionId,
          s.majorVersionNumber,
          s.subVersionNumber,
          s.status,
          s.description,
          s.buildDate,
          s.branch,
          s.componentVersion,
          s.imageName,
          '',
          null,
          'idle',
          null,
          null,
          s.warVersion || null,
          s.jarVersion || null,
          s.frontendVersion || null,
          s.backendVersion || null,
          s.vprobeVersion || null,
          s.scriptVersion || null,
          s.bpmVersion || null
        );
      }
    });
    
    runReset();
    res.json({ message: "Reset successfully", majorVersions: initialMajorVersions, subVersions: initialSubVersions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import bulk database data
app.post("/api/import", (req, res) => {
  try {
    const { majorVersions, subVersions } = req.body;
    if (Array.isArray(majorVersions) && Array.isArray(subVersions)) {
      const runImport = db.transaction(() => {
        db.prepare("DELETE FROM major_versions").run();
        db.prepare("DELETE FROM sub_versions").run();
        
        const insertMajor = db.prepare(`
          INSERT INTO major_versions (
            id, type, versionNumber, priority, status, stage, releaseDate, owner, meetingMinutes, nextStageRDDDL, nextStageQADDL, details, ftpUrl, aiReview
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertSub = db.prepare(`
          INSERT INTO sub_versions (
            id, majorVersionId, majorVersionNumber, subVersionNumber, status, description, buildDate, branch, componentVersion, imageName, buildLink, buildLinkUrl, jenkinsStatus, jenkinsBuildLog, ftpUrl, warVersion, jarVersion, frontendVersion, backendVersion, vprobeVersion, scriptVersion, bpmVersion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const v of majorVersions) {
          insertMajor.run(
            v.id,
            v.type,
            v.versionNumber,
            v.priority,
            v.status,
            v.stage,
            v.releaseDate,
            v.owner,
            v.meetingMinutes || null,
            v.nextStageRDDDL || null,
            v.nextStageQADDL || null,
            v.details || null,
            v.ftpUrl || null,
            v.aiReview || null
          );
        }
        for (const s of subVersions) {
          insertSub.run(
            s.id,
            s.majorVersionId,
            s.majorVersionNumber,
            s.subVersionNumber,
            s.status,
            s.description,
            s.buildDate,
            s.branch,
            s.componentVersion,
            s.imageName,
            '',
            null,
            s.jenkinsStatus || 'idle',
            s.jenkinsBuildLog || null,
            null,
            s.warVersion || null,
            s.jarVersion || null,
            s.frontendVersion || null,
            s.backendVersion || null,
            s.vprobeVersion || null,
            s.scriptVersion || null,
            s.bpmVersion || null
          );
        }
      });
      
      runImport();
      res.json({ message: "Imported successfully", majorVersions, subVersions });
    } else {
      res.status(400).json({ error: "Invalid import format" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Jenkins trigger simulation
app.post("/api/sub-versions/:id/trigger-build", (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare("SELECT * FROM sub_versions WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: "Sub version not found" });
    }

    const startLogs = `[Jenkins CI/CD Pipeline]
[12:00:01] Triggering build for RC: ${existing.subVersionNumber}
[12:00:02] Owner: bohansh@gmail.com
[12:00:03] Git Checkout: branch ${existing.branch} ...
[12:00:04] Workspace initialized. Starting npm install & compilation...`;

    // Set to building
    db.prepare(`
      UPDATE sub_versions SET
        jenkinsStatus = 'building',
        jenkinsBuildLog = ?
      WHERE id = ?
    `).run(startLogs, id);

    // Simulate real pipeline background finish after 3 seconds
    setTimeout(() => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const generatedImageName = `NGPM-${existing.subVersionNumber}-${todayStr}`;
        const generatedFtpUrl = `ftp://ftp.internal/release/${existing.majorVersionNumber}/${generatedImageName}.tar.gz`;
        
        const finalLogs = `${startLogs}
[12:00:06] Bundling modules with Vite... Verified types.
[12:00:08] Run automated sanity tests: 12 passed, 0 failed.
[12:00:10] Building Docker Image: ${generatedImageName}
[12:00:11] Pushing to internal Harbor registry... success!
[12:00:12] Archiving deliverables to FTP: ${generatedFtpUrl}
[12:00:13] Jenkins Job finished successfully.
[STATUS] SUCCESS`;

        db.prepare(`
          UPDATE sub_versions SET
            jenkinsStatus = 'success',
            status = '测试中',
            jenkinsBuildLog = ?,
            buildDate = ?,
            imageName = ?,
            ftpUrl = ?,
            buildLinkUrl = ?
          WHERE id = ?
        `).run(finalLogs, todayStr, generatedImageName, generatedFtpUrl, `http://jenkins.internal/job/build-rc/${id}/console`, id);
      } catch (e) {
        console.error("Error in simulated build completion", e);
      }
    }, 3000);

    const updated = db.prepare("SELECT * FROM sub_versions WHERE id = ?").get(id) as any;
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Gemini AI Release Notes Generator
app.post("/api/ai/release-notes", async (req, res) => {
  try {
    const { versionNumber, subVersions } = req.body;
    
    const detailsText = subVersions && Array.isArray(subVersions) && subVersions.length > 0
      ? subVersions.map((s: any) => `- **${s.subVersionNumber}** (${s.buildDate}): 修复需求/缺陷[${s.description}], 分支[${s.branch}], 镜像[${s.imageName}]`).join("\n")
      : "暂无下属RC版本的具体开发记录。";

    const prompt = `你是一个资深的交付经理，请为大版本【${versionNumber}】制作一份格式精美、排版专业、内容详实的中文交付发布日志（Release Notes）。
包含以下信息并提炼核心亮点：
1. 版本概览 (Version Overview)
2. 包含的RC子版本包及具体变更 (RC Packages & Fixes/Features)
3. 部署镜像及路径 (Docker Images & FTP URL)
4. 测试结论与发布建议 (Testing Conclusion & Recommendations)

版本明细数据如下：
${detailsText}

请直接输出Markdown格式的文本。`;

    // Call Gemini API if key is available, else mock
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy_key") {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "你是一个专业的软件质量与交付大模型助手，输出结构清晰、文字严谨的交付文档。",
          }
        });
        
        const notes = response.text;
        return res.json({ notes });
      } catch (geminiErr: any) {
        console.error("Gemini call failed, falling back to mock", geminiErr);
      }
    }

    // High quality fallback mock notes
    const mockNotes = `# 交付发布日志 (Release Notes) - 版本 【${versionNumber}】
    
## 1. 版本概览 (Version Overview)
本版本是针对大版本 **${versionNumber}** 的正式交付交付件。整合了前期多轮内部测试迭代及需求修复，经过全套自动化冒烟测试和系统集成测试，达到了生产级交付标准。

- **大版本号**: ${versionNumber}
- **交付日期**: ${new Date().toISOString().split('T')[0]}
- **负责人**: 韩波
- **交付状态**: 🟢 具备交付条件

---

## 2. RC子版本迭代明细
本大版本历经了以下关键RC包的迭代与缺陷修复：

${detailsText}

---

## 3. 部署交付物说明
- **容器镜像仓库**: \`registry.internal.net/ngpm/tags/${versionNumber}\`
- **FTP 物理交付件路径**: \`ftp://ftp.internal/release/${versionNumber}/${versionNumber}-release.tar.gz\`
- **打包方式**: Docker Image / Tarball 离线压缩包双轨交付

---

## 4. 智能评估与发布建议
- **质量评估**: 通过率 100%，无已知遗留 Block 级别缺陷。
- **升级建议**: 建议在低峰期进行灰度升级，备份原有持久化存储，升级后观察 CPU/内存指标 15 分钟。`;

    res.json({ notes: mockNotes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Gemini AI Risk Assessment
app.post("/api/ai/risk-assessment", async (req, res) => {
  try {
    const { version } = req.body; // Expects full MajorVersion object
    if (!version) {
      return res.status(400).json({ error: "Missing version data" });
    }

    const subVersions = db.prepare("SELECT * FROM sub_versions WHERE majorVersionId = ?").all(version.id) as any[];

    const prompt = `请对以下软件大版本的发布进行【智能风险与质量评估】。
分析其上线和发布风险（高/中/低），计算时间窗口稳定性（研发与测试截止日期），并给出核心改进建议。

版本基础数据：
- 版本号: ${version.versionNumber}
- 类型: ${version.type}
- 当前阶段: ${version.stage}
- 预计发布日期: ${version.releaseDate}
- 负责人: ${version.owner}
- 研发截止目标 (RD DL): ${version.nextStageRDDDL || '未设置'}
- 测试截止目标 (QA DL): ${version.nextStageQADDL || '未设置'}
- 缺陷/需求细节: ${version.details || '无'}

关联的RC迭代包个数: ${subVersions.length} 个
RC迭代详情:
${subVersions.map(s => `- 包号 ${s.subVersionNumber}, 测试状态 ${s.status}, 变更说明: ${s.description}`).join("\n")}

请输出结构化的评估结果（包含 Markdown 格式的详细分析）。`;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy_key") {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "你是一个资深的软件项目风险控制专家及高阶QA架构师，擅长进行软件交付风险建模与分析。用中文回答，态度专业、尖锐、且富有建设性。",
          }
        });
        
        const assessment = response.text;
        return res.json({ assessment });
      } catch (geminiErr: any) {
        console.error("Gemini assessment call failed, falling back to mock", geminiErr);
      }
    }

    // High quality fallback risk assessment
    const subCount = subVersions.length;
    let riskLevel = "低 (Low)";
    let timelineAnalysis = "时间排期宽裕，RD和QA目标与发布截止日期匹配度良好。";
    if (subCount > 4) {
      riskLevel = "高 (High)";
      timelineAnalysis = "RC迭代包次数过于频繁（共达 " + subCount + " 个），说明需求变更激烈或测试缺陷反弹严重。时间排期极度紧张，极易延期。";
    } else if (subCount > 2) {
      riskLevel = "中 (Medium)";
      timelineAnalysis = "当前经历 " + subCount + " 轮测试收敛，节奏尚可。但若存在未测试完成的RC，需在近期封板。";
    }

    const mockAssessment = `### 🔍 AI 智能发布风险与质量评估报告

#### 1. ⚠️ 综合风险等级: **${riskLevel}**
根据关联RC迭代次数（${subCount}个包）以及研发/测试截止日期计算，本版本被评估为 **${riskLevel}** 风险状态。

#### 2. 📅 时间进度风险 (Timeline Analysis)
- ${timelineAnalysis}
- 建议核对：RD交付期与QA介入期之间是否留存了至少 3-5 天的系统回归窗口。

#### 3. 🧪 RC包演进与收敛质量
- 目前关联了 **${subCount}** 个迭代RC版本包。
- 关键点：${subCount === 0 ? "⚠️ 当前没有登记任何测试RC包，这意味着该版本处于‘空跑’状态，无法验证代码包质量！" : "✅ 已经历 " + subCount + " 轮测试迭代，建议重点检查最后一轮RC包的代码Diff及缺陷返工率。"}

#### 4. 💡 核心改进建议
1. **控制变更输入**: 立即进入代码冻结阶段（Code Freeze），除 Block 级缺陷外，严禁新需求合并。
2. **制定回滚方案**: 鉴于该类型属于 *${version.type}*，上线前必须编写详尽的回滚脚本，并在灰度环境测试回滚指令。
3. **关键人保障**: 发布当天建议负责人 *${version.owner}* 及核心研发人员保持 24 小时电话畅通。`;

    res.json({ assessment: mockAssessment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
