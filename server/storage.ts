import { type ApiSettings, apiSettingsSchema } from "@shared/schema";

export interface IStorage {
  getSettings(): Promise<ApiSettings>;
  updateSettings(settings: Partial<ApiSettings>): Promise<ApiSettings>;
}

export class MemStorage implements IStorage {
  private settings: ApiSettings;

  constructor() {
    this.settings = apiSettingsSchema.parse({});
  }

  async getSettings(): Promise<ApiSettings> {
    return this.settings;
  }

  async updateSettings(partial: Partial<ApiSettings>): Promise<ApiSettings> {
    this.settings = { ...this.settings, ...partial };
    return this.settings;
  }
}

export const storage = new MemStorage();
