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

  static async exportSalesReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const period = (req.query.period as string) || 'daily';
      if (!['daily', 'weekly', 'monthly'].includes(period)) {
        res.status(400).json({ success: false, message: 'period must be daily, weekly, or monthly' });
        return;
      }
      const date = req.query.date as string | undefined;

      const { csv, filename } = await ReportService.buildSalesReportCsv(
        period as 'daily' | 'weekly' | 'monthly',
        date
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}
