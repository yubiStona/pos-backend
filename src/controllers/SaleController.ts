import { Response, NextFunction } from 'express';
import { SaleService } from '../services/SaleService.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { PaymentMethod } from '../entities/Sale.js';

export class SaleController {
  static async createSale(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const sale = await SaleService.createSale(req.body, userId);
      res.status(201).json({ success: true, message: 'Sale completed successfully', data: sale });
    } catch (error) {
      next(error);
    }
  }

  static async getSales(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const paymentMethod = req.query.paymentMethod as PaymentMethod | undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await SaleService.getSales({
        search,
        startDate,
        endDate,
        paymentMethod,
        page,
        limit,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getSaleById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const sale = await SaleService.getSaleById(id);
      res.json({ success: true, data: sale });
    } catch (error) {
      next(error);
    }
  }
}
