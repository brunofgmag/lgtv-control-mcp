import WebSocket from "ws";

const REGISTER_MANIFEST = {
  manifestVersion: 1,
  appVersion: "1.1",
  permissions: [
    "LAUNCH",
    "LAUNCH_WEBAPP",
    "APP_TO_APP",
    "CLOSE",
    "TEST_OPEN",
    "TEST_PROTECTED",
    "CONTROL_AUDIO",
    "CONTROL_DISPLAY",
    "CONTROL_INPUT_JOYSTICK",
    "CONTROL_INPUT_MEDIA_RECORDING",
    "CONTROL_INPUT_MEDIA_PLAYBACK",
    "CONTROL_INPUT_TV",
    "CONTROL_POWER",
    "CONTROL_TV_SCREEN",
    "CONTROL_TV_STANBY",
    "CONTROL_WOL",
    "READ_APP_STATUS",
    "READ_CURRENT_CHANNEL",
    "READ_INPUT_DEVICE_LIST",
    "READ_NETWORK_STATE",
    "READ_RUNNING_APPS",
    "READ_TV_CHANNEL_LIST",
    "READ_POWER_STATE",
    "READ_COUNTRY_INFO",
    "READ_SETTINGS",
    "READ_TV_CURRENT_TIME",
    "WRITE_NOTIFICATION_TOAST",
    "WRITE_NOTIFICATION_ALERT",
    "WRITE_SETTINGS",
    "CONTROL_INPUT_TEXT",
    "CONTROL_MOUSE_AND_KEYBOARD"
  ]
};

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
}

export class LgClient {
  private ws?: WebSocket;
  private readonly host: string;
  private readonly port: number;
  private readonly url: string;
  private nextId = 0;
  private readonly pending = new Map<string, PendingRequest>();
  private connected = false;
  private pointerSocket?: WebSocket;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
    const scheme = port === 3001 ? "wss" : "ws";
    this.url = `${scheme}://${host}:${port}`;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(clientKey: string | undefined): Promise<{ clientKey: string }> {
    await this.openSocket();
    return this.register(clientKey);
  }

  disconnect(): void {
    try {
      this.pointerSocket?.close();
    } catch {
      void 0;
    }
    try {
      this.ws?.close();
    } catch {
      void 0;
    }
    this.connected = false;
  }

  request(uri: string, payload: Record<string, unknown> = {}): Promise<any> {
    if (!this.ws || !this.connected) {
      return Promise.reject(new Error("not connected to the TV"));
    }
    const id = `req_${this.nextId++}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`request timed out: ${uri}`));
      }, 15000);
      this.pending.set(id, {
        resolve: (value: any) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        }
      });
      this.ws!.send(JSON.stringify({ id, type: "request", uri, payload }));
    });
  }

  async lunaRequest(uri: string, params: Record<string, unknown>): Promise<any> {
    const lunaUri = `luna://${uri}`;
    const button = { label: "", onClick: lunaUri, params };
    const payload = {
      message: " ",
      buttons: [button],
      onclose: { uri: lunaUri, params },
      onfail: { uri: lunaUri, params }
    };
    const created = await this.request("ssap://system.notifications/createAlert", payload);
    const alertId = created?.alertId;
    if (!alertId) {
      throw new Error("failed to create alert for luna request");
    }
    return this.request("ssap://system.notifications/closeAlert", { alertId });
  }

  async sendButton(button: string): Promise<{ ok: true; button: string }> {
    const socket = await this.getPointerSocket();
    socket.send(`type:button\nname:${button.toUpperCase()}\n\n`);
    return { ok: true, button: button.toUpperCase() };
  }

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url, { rejectUnauthorized: false });
      this.ws = ws;
      const onError = (err: Error) => {
        reject(new Error(`could not connect to ${this.url}: ${err.message}`));
      };
      ws.once("error", onError);
      ws.once("open", () => {
        ws.removeListener("error", onError);
        this.connected = true;
        ws.on("message", (data) => this.onMessage(data.toString()));
        ws.on("error", () => void 0);
        ws.on("close", () => {
          this.connected = false;
          this.failAll(new Error("connection to the TV was closed"));
        });
        resolve();
      });
    });
  }

  private register(clientKey: string | undefined): Promise<{ clientKey: string }> {
    const id = "register_0";
    const payload: Record<string, unknown> = {
      forcePairing: false,
      pairingType: "PROMPT",
      manifest: REGISTER_MANIFEST
    };
    if (clientKey) {
      payload["client-key"] = clientKey;
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("pairing timed out. Accept the pairing prompt shown on the TV screen and try again."));
      }, 60000);
      this.pending.set(id, {
        resolve: (registered: any) => {
          clearTimeout(timeout);
          resolve({ clientKey: registered?.["client-key"] });
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        }
      });
      this.ws!.send(JSON.stringify({ id, type: "register", payload }));
    });
  }

  private onMessage(raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const id: string | undefined = msg.id;
    if (!id) {
      return;
    }
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }
    if (msg.type === "registered") {
      this.pending.delete(id);
      pending.resolve(msg.payload ?? {});
      return;
    }
    if (msg.type === "error") {
      this.pending.delete(id);
      pending.reject(new Error(msg.error || "the TV rejected the request"));
      return;
    }
    if (msg.type === "response" && id.startsWith("register")) {
      return;
    }
    this.pending.delete(id);
    if (msg.payload && msg.payload.returnValue === false) {
      pending.reject(new Error(msg.payload.errorText || "the TV returned an unsuccessful response"));
      return;
    }
    pending.resolve(msg.payload ?? {});
  }

  private async getPointerSocket(): Promise<WebSocket> {
    if (this.pointerSocket && this.pointerSocket.readyState === WebSocket.OPEN) {
      return this.pointerSocket;
    }
    const res = await this.request("ssap://com.webos.service.networkinput/getPointerInputSocket");
    const path: string | undefined = res?.socketPath;
    if (!path) {
      throw new Error("could not obtain the pointer input socket");
    }
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(path, { rejectUnauthorized: false });
      ws.once("open", () => {
        this.pointerSocket = ws;
        ws.on("error", () => void 0);
        resolve(ws);
      });
      ws.once("error", (err) => reject(new Error(`could not open pointer socket: ${err.message}`)));
    });
  }

  private failAll(err: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(err);
    }
    this.pending.clear();
  }
}
