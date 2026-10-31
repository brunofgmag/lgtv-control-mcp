#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LgClient } from "./lg-client.js";
import { LgApi } from "./lg-api.js";
import { findTv, loadTvs, readStoredKey, requireTv, resolveTv, saveTvs, storeKey } from "./config.js";

const connections = new Map<string, { client: LgClient; api: LgApi }>();

async function ensureApi(tvName?: string): Promise<LgApi> {
  const tv = await resolveTv(tvName);
  const poolKey = `${tv.host}:${tv.port}`;
  const existing = connections.get(poolKey);
  if (existing?.client.isConnected) {
    return existing.api;
  }
  existing?.client.disconnect();
  const key = tv.clientKey ?? (await readStoredKey(tv.host));
  const connection = new LgClient(tv.host, tv.port);
  const result = await connection.connect(key);
  if (result.clientKey && result.clientKey !== key) {
    await storeKey(tv.host, result.clientKey);
    console.error(`[lgtv-control-mcp] paired with ${tv.name} (${tv.host}); client key saved to ~/.lgtv-control-mcp/keys.json`);
  }
  connections.set(poolKey, { client: connection, api: new LgApi(connection) });
  return connections.get(poolKey)!.api;
}

function ok(data: unknown) {
  const text = typeof data === "string" ? data : JSON.stringify(data ?? { ok: true }, null, 2);
  return { content: [{ type: "text" as const, text }] };
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

const server = new McpServer({ name: "lgtv-control-mcp", version: "1.1.1" });

function tool(
  name: string,
  description: string,
  shape: z.ZodRawShape,
  run: (lg: LgApi, args: any) => Promise<unknown>
): void {
  const inputSchema = {
    ...shape,
    tv: z.string().optional().describe("Name of a TV registered with add_tv. Omit to use the default TV.")
  };
  server.registerTool(name, { description, inputSchema }, async (args: any) => {
    try {
      const lg = await ensureApi(args.tv);
      return ok(await run(lg, args));
    } catch (err) {
      return fail(err);
    }
  });
}

function registryTool(
  name: string,
  description: string,
  shape: z.ZodRawShape,
  run: (args: any) => Promise<unknown>
): void {
  server.registerTool(name, { description, inputSchema: shape }, async (args: any) => {
    try {
      return ok(await run(args));
    } catch (err) {
      return fail(err);
    }
  });
}

registryTool(
  "add_tv",
  "Register a named TV or update an existing one (same name overwrites). The first TV added becomes the default.",
  {
    name: z.string().describe('TV name, e.g. "Living Room"'),
    host: z.string().describe("TV IP address on the local network"),
    port: z.number().int().optional().describe("3001 = wss (default); 3000 = plain ws")
  },
  async ({ name, host, port }) => {
    const registry = await loadTvs();
    const trimmed = name.trim();
    const existing = findTv(registry, trimmed);
    if (existing && existing.name !== trimmed) {
      delete registry.tvs[existing.name];
    }
    registry.tvs[trimmed] = { host: host.trim(), port: port ?? existing?.entry.port ?? 3001 };
    if (!registry.default || existing?.name === registry.default) {
      registry.default = trimmed;
    }
    await saveTvs(registry);
    return { ok: true, name: trimmed, ...registry.tvs[trimmed], isDefault: registry.default === trimmed };
  }
);

registryTool(
  "remove_tv",
  "Remove a TV from the registry.",
  { name: z.string() },
  async ({ name }) => {
    const registry = await loadTvs();
    const found = requireTv(registry, name);
    delete registry.tvs[found.name];
    if (registry.default === found.name) {
      registry.default = Object.keys(registry.tvs)[0];
    }
    await saveTvs(registry);
    return { ok: true, removed: found.name, default: registry.default ?? null };
  }
);

registryTool(
  "list_tvs",
  "List registered TVs and which one is the default.",
  {},
  async () => {
    const registry = await loadTvs();
    const tvs = Object.entries(registry.tvs).map(([name, entry]) => ({
      name,
      ...entry,
      isDefault: name === registry.default
    }));
    if (!tvs.length) {
      const host = process.env.LGTV_HOST?.trim();
      return {
        tvs,
        note: host
          ? `no TVs registered; commands go to LGTV_HOST (${host})`
          : "no TVs registered; use add_tv"
      };
    }
    return { tvs };
  }
);

registryTool(
  "set_default_tv",
  "Set the default TV used when a command does not specify one.",
  { name: z.string() },
  async ({ name }) => {
    const registry = await loadTvs();
    const found = requireTv(registry, name);
    registry.default = found.name;
    await saveTvs(registry);
    return { ok: true, default: found.name };
  }
);

const level = z.number().int().min(0).max(100);

tool(
  "set_backlight",
  "Set the TV backlight level from 0 to 100. This is the primary brightness control for an LG webOS TV.",
  { value: level },
  (lg, { value }) => lg.setBacklight(value)
);

tool(
  "set_picture_setting",
  "Set a picture setting (backlight, contrast, brightness or color) from 0 to 100.",
  { key: z.enum(["backlight", "contrast", "brightness", "color"]), value: level },
  (lg, { key, value }) => lg.setPictureSetting(key, value)
);

tool(
  "set_picture_mode",
  "Set the picture mode (e.g. cinema, normal, vivid, game, expert1, expert2, filmMaker, hdrEffect).",
  { mode: z.string() },
  (lg, { mode }) => lg.setPictureMode(mode)
);

tool(
  "set_peak_brightness",
  "Set the peak brightness of the TV to off, low, medium or high.",
  { value: z.enum(["off", "low", "medium", "high"]) },
  (lg, { value }) => lg.setPeakBrightness(value)
);

tool(
  "get_picture_settings",
  "Read current picture settings (backlight, contrast, brightness, color).",
  {},
  (lg) => lg.getPictureSettings()
);

tool("volume_up", "Increase the TV volume by one step.", {}, (lg) => lg.volumeUp());
tool("volume_down", "Decrease the TV volume by one step.", {}, (lg) => lg.volumeDown());
tool("set_volume", "Set the TV volume to an absolute level from 0 to 100.", { volume: level }, (lg, { volume }) => lg.setVolume(volume));
tool("get_volume", "Read the current volume and mute state.", {}, (lg) => lg.getVolume());
tool("set_mute", "Mute or unmute the TV.", { mute: z.boolean() }, (lg, { mute }) => lg.setMute(mute));

tool("list_inputs", "List available external inputs (HDMI, etc.).", {}, (lg) => lg.getInputs());
tool("set_input", "Switch to an external input by its id (e.g. HDMI_1).", { inputId: z.string() }, (lg, { inputId }) => lg.setInput(inputId));

tool("list_apps", "List installed apps and their launch ids.", {}, (lg) => lg.listApps());
tool("launch_app", "Launch an app by its id (e.g. netflix, youtube.leanback.v4, com.webos.app.hdmi1).", { appId: z.string() }, (lg, { appId }) => lg.launchApp(appId));
tool("close_app", "Close an app by its id.", { appId: z.string() }, (lg, { appId }) => lg.closeApp(appId));
tool("get_foreground_app", "Get the currently foreground app.", {}, (lg) => lg.getForegroundApp());

tool("channel_up", "Go to the next channel.", {}, (lg) => lg.channelUp());
tool("channel_down", "Go to the previous channel.", {}, (lg) => lg.channelDown());
tool("set_channel", "Tune to a channel by its channelId.", { channelId: z.string() }, (lg, { channelId }) => lg.setChannel(channelId));
tool("list_channels", "List available TV channels.", {}, (lg) => lg.getChannels());
tool("get_current_channel", "Get the currently tuned channel.", {}, (lg) => lg.getCurrentChannel());

tool("media_play", "Send media play.", {}, (lg) => lg.play());
tool("media_pause", "Send media pause.", {}, (lg) => lg.pause());
tool("media_stop", "Send media stop.", {}, (lg) => lg.stop());
tool("media_rewind", "Send media rewind.", {}, (lg) => lg.rewind());
tool("media_fast_forward", "Send media fast-forward.", {}, (lg) => lg.fastForward());

tool("power_off", "Turn the TV off (standby).", {}, (lg) => lg.powerOff());
tool("screen_off", "Turn off the screen while keeping the TV running.", {}, (lg) => lg.screenOff());
tool("screen_on", "Turn the screen back on.", {}, (lg) => lg.screenOn());
tool("get_power_state", "Read the current power state.", {}, (lg) => lg.getPowerState());

tool("show_toast", "Display a toast notification message on the TV.", { message: z.string() }, (lg, { message }) => lg.showToast(message));

tool(
  "send_button",
  "Send a remote-control button press. Common names: 0-9, HOME, BACK, ENTER, EXIT, UP, DOWN, LEFT, RIGHT, MENU, MUTE, VOLUMEUP, VOLUMEDOWN, CHANNELUP, CHANNELDOWN, PLAY, PAUSE, STOP, REWIND, FASTFORWARD, RED, GREEN, YELLOW, BLUE, DASH, GUIDE, NETFLIX, AMAZON.",
  { button: z.string() },
  (lg, { button }) => lg.sendButton(button)
);

tool("set_3d_on", "Enable 3D mode.", {}, (lg) => lg.set3dOn());
tool("set_3d_off", "Disable 3D mode.", {}, (lg) => lg.set3dOff());

tool("get_system_info", "Get TV system information (model, etc.).", {}, (lg) => lg.getSystemInfo());
tool("get_software_info", "Get TV software / firmware information.", {}, (lg) => lg.getSoftwareInfo());
tool("get_service_list", "List available SSAP services on the TV.", {}, (lg) => lg.getServiceList());

tool(
  "ssap_request",
  "Escape hatch: send a raw SSAP request to the TV. Provide the full uri (e.g. ssap://audio/getVolume) and an optional payload object.",
  { uri: z.string(), payload: z.record(z.any()).optional() },
  (lg, { uri, payload }) => lg.raw(uri, payload)
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[lgtv-control-mcp] server running on stdio");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
