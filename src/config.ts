import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const CONFIG_DIR = join(homedir(), ".lgtv-control-mcp");
const KEYS_FILE = join(CONFIG_DIR, "keys.json");
const TVS_FILE = join(CONFIG_DIR, "tvs.json");

export interface TvEntry {
  host: string;
  port: number;
}

export interface TvRegistry {
  default?: string;
  tvs: Record<string, TvEntry>;
}

export interface ResolvedTv extends TvEntry {
  name: string;
  clientKey?: string;
}

export async function loadTvs(): Promise<TvRegistry> {
  try {
    const data = JSON.parse(await readFile(TVS_FILE, "utf8")) as TvRegistry;
    return { default: data.default, tvs: data.tvs ?? {} };
  } catch {
    return { tvs: {} };
  }
}

export async function saveTvs(registry: TvRegistry): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(TVS_FILE, JSON.stringify(registry, null, 2), "utf8");
}

export function findTv(registry: TvRegistry, name: string): { name: string; entry: TvEntry } | undefined {
  const target = name.trim().toLowerCase();
  for (const [key, entry] of Object.entries(registry.tvs)) {
    if (key.trim().toLowerCase() === target) {
      return { name: key, entry };
    }
  }
  return undefined;
}

export function requireTv(registry: TvRegistry, name: string): { name: string; entry: TvEntry } {
  const found = findTv(registry, name);
  if (!found) {
    const known = Object.keys(registry.tvs);
    throw new Error(
      known.length
        ? `unknown TV "${name}". Configured TVs: ${known.join(", ")}`
        : `unknown TV "${name}". No TVs are configured yet; use add_tv first.`
    );
  }
  return found;
}

export async function resolveTv(name?: string): Promise<ResolvedTv> {
  const registry = await loadTvs();
  if (name) {
    const found = requireTv(registry, name);
    return { name: found.name, ...found.entry };
  }
  if (registry.default) {
    const found = requireTv(registry, registry.default);
    return { name: found.name, ...found.entry };
  }
  const host = process.env.LGTV_HOST?.trim();
  if (host) {
    return {
      name: host,
      host,
      port: Number(process.env.LGTV_PORT) || 3001,
      clientKey: process.env.LGTV_CLIENT_KEY?.trim() || undefined
    };
  }
  const known = Object.keys(registry.tvs);
  if (known.length) {
    throw new Error(`no default TV set. Pass the tv parameter (one of: ${known.join(", ")}) or use set_default_tv.`);
  }
  throw new Error(
    'no TV configured. Register one with add_tv (e.g. name "Living Room", host 192.168.1.50) or set LGTV_HOST.'
  );
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
  let data: Record<string, string>;
  try {
    data = JSON.parse(await readFile(KEYS_FILE, "utf8")) as Record<string, string>;
  } catch {
    data = {};
  }
  data[host] = clientKey;
  await writeFile(KEYS_FILE, JSON.stringify(data, null, 2), "utf8");
}
