import { getSettingRepository } from '../repositories/repositories.js';
import { Setting } from '../entities/Setting.js';

export class SettingService {
  static async getSettings() {
    const settingRepo = getSettingRepository();
    const settingsList = await settingRepo.find();

    const settingsMap: Record<string, string> = {
      storeName: 'Small-Mart Supermarket',
      address: 'Main Street, Retail Plaza #4',
      phone: '+977 1 4230000 / 9801000000',
      email: 'contact@smallmart.com',
      currency: 'NPR',
      currencySymbol: 'Rs. ',
      vatPercentage: '0',
      invoiceFooter: 'Thank you for shopping at Small-Mart! Please keep this receipt for returns.',
      receiptWidth: '80mm',
    };

    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return settingsMap;
  }

  static async updateSettings(settings: Record<string, string>) {
    const settingRepo = getSettingRepository();

    for (const [key, value] of Object.entries(settings)) {
      let setting = await settingRepo.findOne({ where: { key } });
      if (!setting) {
        setting = settingRepo.create({ key, value: String(value) });
      } else {
        setting.value = String(value);
      }
      await settingRepo.save(setting);
    }

    return await SettingService.getSettings();
  }
}
