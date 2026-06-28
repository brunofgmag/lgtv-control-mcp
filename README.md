# lgtv-control-mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for controlling **LG webOS TVs** from AI clients like **Claude**, **Codex**, **GitHub Copilot**, and **Antigravity**.

Communication uses the webOS **SSAP** protocol over WebSocket, the same one used by the LG ThinQ app and projects like ColorControl.

## Tools

- `set_backlight`: backlight 0-100
- `set_picture_setting` / `set_picture_mode` / `get_picture_settings`: contrast, brightness, color, and picture mode
- `set_volume` / `volume_up` / `volume_down` / `get_volume` / `set_mute`
- `list_inputs` / `set_input`: switch HDMI and other inputs
- `list_apps` / `launch_app` / `close_app` / `get_foreground_app`
- `channel_up` / `channel_down` / `set_channel` / `list_channels` / `get_current_channel`
- `media_play` / `media_pause` / `media_stop` / `media_rewind` / `media_fast_forward`
- `power_off` / `screen_off` / `screen_on` / `get_power_state`
- `set_3d_on` / `set_3d_off`
- `show_toast`: display a notification on the TV
- `send_button`: press a remote button. Compatible names include `0`-`9`, `HOME`, `BACK`, `ENTER`, `EXIT`, `UP`, `DOWN`, `LEFT`, `RIGHT`, `RED`, `GREEN`, `YELLOW`, `BLUE`, `POWER`, `VOLUMEUP`, `VOLUMEDOWN`, `MUTE`, `MENU`, `CC`, `DASH`, `CHANNELUP`, `CHANNELDOWN`, `LIST`, `AD`, `SAP`, `PROGRAM`, `PLAY`, `PAUSE`, `STOP`, `REWIND`, `FASTFORWARD`, `GUIDE`, `AMAZON`, `NETFLIX`, `MAGNIFIER_ZOOM`, `LIVE_ZOOM`, `3D_MODE`, `ASPECT_RATIO`, `RECENT`, `RECORD`, `SCREEN_REMOTE`, `MYAPPS`
- `get_system_info` / `get_software_info` / `get_service_list`
- `ssap_request`: send any raw SSAP command (escape hatch)

## Requirements

- **Node.js 18+**
- An LG webOS TV powered on and on the same local network
- The TV's **IP address** (Settings > Network)
- Mobile TV On enabled (Settings > Connection > External Devices > On via Wi-Fi)

## Installation

### Global install

```bash
npm install -g lgtv-control-mcp
```

This puts the `lgtv-control-mcp` binary in your PATH. Use `command: "lgtv-control-mcp"` with no `args` in your client config.

### Via npx (no install)

```bash
npx -y lgtv-control-mcp@latest
```

This does not install the package. The MCP client runs this command each time it starts the server; npm caches the package after the first download.

### From source

```bash
git clone https://github.com/brunofgmag/lgtv-control-mcp.git
cd lgtv-control-mcp
npm install
npm run build
node dist/index.js
```

## Pairing

The first time you connect, the TV shows a **"Connection Request"** prompt on screen. Accept it with the remote.

The client key is saved automatically to `~/.lgtv-control-mcp/keys.json` and reused on later connections. You don't need to configure it manually. If you want to pin a specific key, copy the value from that file into `LGTV_CLIENT_KEY`.

## Client configuration

Set the TV's IP using the `LGTV_HOST` environment variable in your client config.

### Claude Desktop

Open **Settings → Developer → Edit Config**. This opens `claude_desktop_config.json` directly in your editor. Add the entry and restart the app.

```json
{
  "mcpServers": {
    "lgtv-control": {
      "command": "npx",
      "args": ["-y", "lgtv-control-mcp@latest"],
      "env": { "LGTV_HOST": "192.168.1.50" }
    }
  }
}
```

If you installed globally, use `"command": "lgtv-control-mcp"` with `"args": []`.

### Claude Code

The `--scope user` flag adds the server globally across all your projects:

```bash
claude mcp add lgtv-control --scope user --env LGTV_HOST=192.168.1.50 -- npx -y lgtv-control-mcp@latest
```

If you installed globally, replace `npx -y lgtv-control-mcp@latest` with just `lgtv-control-mcp`.

Or add it manually to `~/.claude/settings.json` (user-level, global):

```json
{
  "mcpServers": {
    "lgtv-control": {
      "command": "npx",
      "args": ["-y", "lgtv-control-mcp@latest"],
      "env": { "LGTV_HOST": "192.168.1.50" }
    }
  }
}
```

### Codex CLI

Via CLI:

```bash
codex mcp add lgtv-control --env LGTV_HOST=192.168.1.50 -- npx -y lgtv-control-mcp@latest
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers."lgtv-control"]
command = "npx"
args = ["-y", "lgtv-control-mcp@latest"]

[mcp_servers."lgtv-control".env]
LGTV_HOST = "192.168.1.50"
```

### GitHub Copilot / VS Code

In `.vscode/mcp.json` or your user MCP settings:

```json
{
  "servers": {
    "lgtv-control": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "lgtv-control-mcp@latest"],
      "env": { "LGTV_HOST": "192.168.1.50" }
    }
  }
}
```

For Copilot clients that expect the `mcpServers` format:

```json
{
  "mcpServers": {
    "lgtv-control": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "lgtv-control-mcp@latest"],
      "env": { "LGTV_HOST": "192.168.1.50" },
      "tools": ["*"]
    }
  }
}
```

### Antigravity

```json
{
  "mcpServers": {
    "lgtv-control": {
      "command": "npx",
      "args": ["-y", "lgtv-control-mcp@latest"],
      "env": { "LGTV_HOST": "192.168.1.50" }
    }
  }
}
```

### Other MCP clients

Most clients that support local MCP via `stdio` use the same pattern:

```json
{
  "mcpServers": {
    "lgtv-control": {
      "command": "npx",
      "args": ["-y", "lgtv-control-mcp@latest"],
      "env": { "LGTV_HOST": "192.168.1.50" }
    }
  }
}
```

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `LGTV_HOST` | yes | - | TV IP address on the local network |
| `LGTV_PORT` | no | `3001` | `3001` = wss (self-signed TLS); use `3000` for plain ws |
| `LGTV_CLIENT_KEY` | no | - | Pairing key; obtained and saved automatically on first use |

## Usage examples

Once configured, try asking your AI:

- "Set the TV backlight to 30"
- "Turn up the volume" / "Switch to HDMI 2"
- "Open Netflix" / "Turn off the TV screen"
- "Show a 'Dinner's ready' notification on the TV"

## Troubleshooting

- **"pairing timed out"**: accept the connection prompt on the TV screen and try again.
- **"could not connect"**: check the IP, that the TV is on and on the same network. Try `LGTV_PORT=3000`.
- **Backlight not changing**: some firmware versions require the luna path. The server already tries SSAP first and falls back automatically. Also check that your current picture mode allows manual backlight adjustment.
- **Re-pairing**: delete the TV's entry in `~/.lgtv-control-mcp/keys.json` to force a new pairing prompt.

## How it works

The server opens an SSAP WebSocket with the TV, performs the registration handshake (with `pairingType: PROMPT`), and sends `ssap://...` requests. Remote control buttons use a separate pointer socket (`getPointerInputSocket`). Picture adjustments use `setSystemSettings`; when the direct SSAP path is rejected by the firmware, the server uses the luna trick (creating and closing an alert whose `onclose` points to `luna://com.webos.settingsservice/setSystemSettings`).

## License

[MIT](LICENSE)
