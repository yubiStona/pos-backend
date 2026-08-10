import { Request, Response, NextFunction } from 'express';
import { SettingService } from '../services/SettingService.js';

export class SettingController {
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingService.getSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingService.updateSettings(req.body);
      res.json({ success: true, message: 'Settings updated successfully', data: settings });
    } catch (error) {
      next(error);
    }
  }
}
