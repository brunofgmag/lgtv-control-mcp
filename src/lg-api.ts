import { LgClient } from "./lg-client.js";

const PICTURE_KEYS = ["backlight", "contrast", "brightness", "color"];

export class LgApi {
  constructor(private readonly client: LgClient) {}

  async setPictureSetting(key: string, value: number | string): Promise<unknown> {
    const settings = { [key]: value };
    try {
      return await this.client.request("ssap://settings/setSystemSettings", {
        category: "picture",
        settings
      });
    } catch {
      return this.client.lunaRequest("com.webos.settingsservice/setSystemSettings", {
        category: "picture",
        settings
      });
    }
  }

  setBacklight(value: number): Promise<unknown> {
    return this.setPictureSetting("backlight", value);
  }

  getPictureSettings(keys: string[] = PICTURE_KEYS): Promise<unknown> {
    return this.client.request("ssap://settings/getSystemSettings", { category: "picture", keys });
  }

  setPictureMode(mode: string): Promise<unknown> {
    return this.setPictureSetting("pictureMode", mode);
  }

  volumeUp(): Promise<unknown> {
    return this.client.request("ssap://audio/volumeUp");
  }

  volumeDown(): Promise<unknown> {
    return this.client.request("ssap://audio/volumeDown");
  }

  setVolume(volume: number): Promise<unknown> {
    return this.client.request("ssap://audio/setVolume", { volume });
  }

  getVolume(): Promise<unknown> {
    return this.client.request("ssap://audio/getVolume");
  }

  getAudioStatus(): Promise<unknown> {
    return this.client.request("ssap://audio/getStatus");
  }

  setMute(mute: boolean): Promise<unknown> {
    return this.client.request("ssap://audio/setMute", { mute });
  }

  getInputs(): Promise<unknown> {
    return this.client.request("ssap://tv/getExternalInputList");
  }

  setInput(inputId: string): Promise<unknown> {
    return this.client.request("ssap://tv/switchInput", { inputId });
  }

  listApps(): Promise<unknown> {
    return this.client.request("ssap://com.webos.applicationManager/listLaunchPoints");
  }

  launchApp(id: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.client.request("ssap://system.launcher/launch", params ? { id, params } : { id });
  }

  closeApp(id: string): Promise<unknown> {
    return this.client.request("ssap://system.launcher/close", { id });
  }

  getForegroundApp(): Promise<unknown> {
    return this.client.request("ssap://com.webos.applicationManager/getForegroundAppInfo");
  }

  channelUp(): Promise<unknown> {
    return this.client.request("ssap://tv/channelUp");
  }

  channelDown(): Promise<unknown> {
    return this.client.request("ssap://tv/channelDown");
  }

  getChannels(): Promise<unknown> {
    return this.client.request("ssap://tv/getChannelList");
  }

  getCurrentChannel(): Promise<unknown> {
    return this.client.request("ssap://tv/getCurrentChannel");
  }

  setChannel(channelId: string): Promise<unknown> {
    return this.client.request("ssap://tv/openChannel", { channelId });
  }

  play(): Promise<unknown> {
    return this.client.request("ssap://media.controls/play");
  }

  pause(): Promise<unknown> {
    return this.client.request("ssap://media.controls/pause");
  }

  stop(): Promise<unknown> {
    return this.client.request("ssap://media.controls/stop");
  }

  rewind(): Promise<unknown> {
    return this.client.request("ssap://media.controls/rewind");
  }

  fastForward(): Promise<unknown> {
    return this.client.request("ssap://media.controls/fastForward");
  }

  powerOff(): Promise<unknown> {
    return this.client.request("ssap://system/turnOff");
  }

  screenOff(): Promise<unknown> {
    return this.client.request("ssap://com.webos.service.tvpower/power/turnOffScreen");
  }

  screenOn(): Promise<unknown> {
    return this.client.request("ssap://com.webos.service.tvpower/power/turnOnScreen");
  }

  getPowerState(): Promise<unknown> {
    return this.client.request("ssap://com.webos.service.tvpower/power/getPowerState");
  }

  showToast(message: string): Promise<unknown> {
    return this.client.request("ssap://system.notifications/createToast", { message });
  }

  getSystemInfo(): Promise<unknown> {
    return this.client.request("ssap://system/getSystemInfo");
  }

  getSoftwareInfo(): Promise<unknown> {
    return this.client.request("ssap://com.webos.service.update/getCurrentSWInformation");
  }

  getServiceList(): Promise<unknown> {
    return this.client.request("ssap://api/getServiceList");
  }

  set3dOn(): Promise<unknown> {
    return this.client.request("ssap://com.webos.service.tv.display/set3DOn");
  }

  set3dOff(): Promise<unknown> {
    return this.client.request("ssap://com.webos.service.tv.display/set3DOff");
  }

  sendButton(button: string): Promise<unknown> {
    return this.client.sendButton(button);
  }

  raw(uri: string, payload?: Record<string, unknown>): Promise<unknown> {
    return this.client.request(uri, payload ?? {});
  }
}
