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
- `show_toast`: display a notification on the TV
- `send_button`: press any remote button (UP, DOWN, ENTER, BACK, HOME, etc.)
- `get_system_info` / `get_software_info` / `get_service_list`
- `ssap_request`: send any raw SSAP command (escape hatch)

## Requirements

- **Node.js 18+**
- An LG webOS TV powered on and on the same local network
- The TV's **IP address** (Settings > Network)
- Mobile TV On enabled (Settings > Connection > External Devices > On via Wi-Fi)

## Installation

### Recommended: npx

```bash
npx -y lgtv-control-mcp@latest
```

### Global install

If you prefer a command available anywhere on your system:

```bash
npm install -g lgtv-control-mcp
```

Then use `command: "lgtv-control-mcp"` with no `args`.

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

### Claude Code

Via CLI:

```bash
claude mcp add lgtv-control --scope user --env LGTV_HOST=192.168.1.50 -- npx -y lgtv-control-mcp@latest
```

Or in `.mcp.json`:

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
