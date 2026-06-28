import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const CONFIG_DIR = join(homedir(), ".lgtv-control-mcp");
const KEYS_FILE = join(CONFIG_DIR, "keys.json");

export interface TvConfig {
  host: string;
  port: number;
  clientKey?: string;
}

export function loadEnvConfig(): TvConfig {
  const host = process.env.LGTV_HOST?.trim();
  if (!host) {
    throw new Error(
      "LGTV_HOST is not set. Configure the TV IP address (e.g. LGTV_HOST=192.168.1.50) in the MCP server env."
    );
  }
  const port = Number(process.env.LGTV_PORT) || 3001;
  const clientKey = process.env.LGTV_CLIENT_KEY?.trim() || undefined;
  return { host, port, clientKey };
}

export async function readStoredKey(host: string): Promise<string | undefined> {
  try {
    const raw = await readFile(KEYS_FILE, "utf8");
    const data = JSON.parse(raw) as Record<string, string>;
    return data[host];
  } catch {
    return undefined;
  }
}

export async function storeKey(host: string, clientKey: string): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  let data: Record<string, string> = {};
  try {
    data = JSON.parse(await readFile(KEYS_FILE, "utf8")) as Record<string, string>;
  } catch {
    data = {};
  }
  data[host] = clientKey;
  await writeFile(KEYS_FILE, JSON.stringify(data, null, 2), "utf8");
}
