import { isTauriRuntime } from '../utils/systemTray';

export const autostartService = {
  async isEnabled(): Promise<boolean> {
    if (!isTauriRuntime()) return false;
    try {
      const { isEnabled } = await import('@tauri-apps/plugin-autostart');
      return isEnabled();
    } catch (error) {
      console.error('Failed to read autostart state:', error);
      throw error;
    }
  },

  async enable(): Promise<void> {
    if (!isTauriRuntime()) return;
    try {
      const { enable } = await import('@tauri-apps/plugin-autostart');
      await enable();
    } catch (error) {
      console.error('Failed to enable autostart:', error);
      throw error;
    }
  },

  async disable(): Promise<void> {
    if (!isTauriRuntime()) return;
    try {
      const { disable } = await import('@tauri-apps/plugin-autostart');
      await disable();
    } catch (error) {
      console.error('Failed to disable autostart:', error);
      throw error;
    }
  },

  async syncWithPreference(enabled: boolean): Promise<boolean> {
    const osEnabled = await this.isEnabled();
    if (enabled === osEnabled) return enabled;

    if (enabled) {
      await this.enable();
    } else {
      await this.disable();
    }

    return enabled;
  },
};
