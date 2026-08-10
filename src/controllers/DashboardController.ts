import { Response, NextFunction } from 'express';
import { DashboardService } from '../services/DashboardService.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class DashboardController {
  static async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await DashboardService.getDashboardSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
}
