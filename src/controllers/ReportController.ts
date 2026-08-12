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
      if (!['daily', 'weekly', 'monthly', 'custom'].includes(period)) {
        res.status(400).json({ success: false, message: 'period must be daily, weekly, monthly, or custom' });
        return;
      }

      const format = ((req.query.format as string) || 'xlsx').toLowerCase();
      if (!['xlsx', 'pdf'].includes(format)) {
        res.status(400).json({ success: false, message: 'format must be xlsx or pdf' });
        return;
      }

      const date = req.query.date as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const periodArg = period as 'daily' | 'weekly' | 'monthly' | 'custom';

      const result =
        format === 'pdf'
          ? await ReportService.buildSalesReportPdf(periodArg, date, startDate, endDate)
          : await ReportService.buildSalesReportXlsx(periodArg, date, startDate, endDate);

      res.setHeader(
        'Content-Type',
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  }
}
