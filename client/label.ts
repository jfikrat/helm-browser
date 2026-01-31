// Helm MCP Client - Auto-detect AI client label

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type Hit = { name: string; confidence: number; source: string };

// Known AI client patterns
const CLIENT_PATTERNS = [
  { name: "Claude", patterns: [/\bclaude\b/i, /anthropic/i] },
  { name: "Gemini", patterns: [/\bgemini\b/i] },
  { name: "Codex", patterns: [/\bcodex\b/i] },
  { name: "Aider", patterns: [/\baider\b/i] },
  { name: "Cursor", patterns: [/\bcursor\b/i] },
  { name: "Cline", patterns: [/\bcline\b/i] },
  { name: "Windsurf", patterns: [/\bwindsurf\b/i] },
];

function matchClient(text: string): string | null {
  for (const c of CLIENT_PATTERNS) {
    if (c.patterns.some((re) => re.test(text))) return c.name;
  }
  return null;
}

// Check environment variables for hints
function detectFromEnv(): Hit | null {
  // Check specific known env vars first
  if (process.env.CLAUDE_CODE_VERSION) {
    return { name: "Claude", confidence: 0.9, source: "env:CLAUDE_CODE_VERSION" };
  }

  for (const [k, v] of Object.entries(process.env)) {
    const key = k.toLowerCase();
    const val = (v || "").toLowerCase();

    // Skip API keys to avoid false positives
    if (key.includes("api_key") || key.includes("apikey")) continue;

    const name = matchClient(key) || matchClient(val);
    if (name) return { name, confidence: 0.35, source: `env:${k}` };
  }
  return null;
}

// Check process arguments
function detectFromArgv(): Hit | null {
  const text = [process.execPath, ...process.argv].join(" ").toLowerCase();
  const name = matchClient(text);
  return name ? { name, confidence: 0.45, source: "argv" } : null;
}

// Analyze process tree (most reliable)
async function detectFromProcessTree(): Promise<Hit | null> {
  try {
    const args =
      process.platform === "darwin"
        ? ["-axo", "pid=,ppid=,command="]
        : ["-eo", "pid=,ppid=,command="];

    const { stdout } = await execFileAsync("ps", args, {
      maxBuffer: 1024 * 1024,
      timeout: 2000
    });

    const map = new Map<number, { ppid: number; cmd: string }>();

    for (const line of stdout.split("\n")) {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
      if (!m) continue;
      map.set(Number(m[1]), { ppid: Number(m[2]), cmd: m[3] });
    }

    // Walk up the process tree (up to 8 levels)
    let pid = process.ppid;
    for (let i = 0; i < 8 && pid > 1; i++) {
      const entry = map.get(pid);
      if (!entry) break;
      const name = matchClient(entry.cmd);
      if (name) return { name, confidence: 0.75, source: `ps:${entry.cmd.slice(0, 50)}` };
      pid = entry.ppid;
    }
  } catch (error) {
    // ps command failed, skip this detection method
    console.error("[Client] Process tree detection failed:", error);
  }
  return null;
}

// Pick the best hit based on confidence
function pickBest(...hits: Array<Hit | null>): Hit | null {
  const valid = hits.filter((h): h is Hit => h !== null);
  return valid.sort((a, b) => b.confidence - a.confidence)[0] || null;
}

// Extract short suffix from session ID for uniqueness
function getShortId(sessionId: string): string {
  const tail = sessionId.split("-").pop() || "";
  return tail.slice(-4) || process.pid.toString(36).slice(-4);
}

// Build session label with auto-detection
export async function buildSessionLabel(baseCwd: string, sessionId: string): Promise<string> {
  // If explicitly set, use that
  if (process.env.HELM_SESSION_LABEL) {
    return process.env.HELM_SESSION_LABEL;
  }

  const shortId = getShortId(sessionId);

  // Try to detect the AI client
  const hit = pickBest(
    detectFromArgv(),
    detectFromEnv(),
    await detectFromProcessTree()
  );

  if (hit) {
    console.error(`[Client] Detected AI client: ${hit.name} (${hit.source}, confidence: ${hit.confidence})`);
    return `${hit.name} (${baseCwd}) · ${shortId}`;
  }

  // Fallback: generic label with short ID for uniqueness
  return `MCP Client (${baseCwd}) · ${shortId}`;
}
