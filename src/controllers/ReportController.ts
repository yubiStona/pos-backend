import { Response, NextFunction } from 'express';
import { ReportService } from '../services/ReportService.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class ReportController {
  static async getSalesReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const report = await ReportService.getSalesReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async getProductSalesReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const report = await ReportService.getProductSalesReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async getCategorySalesReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const report = await ReportService.getCategorySalesReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async getStockReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const report = await ReportService.getStockReport();
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const report = await ReportService.getPurchaseReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
}
