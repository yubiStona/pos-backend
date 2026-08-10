import { Response, NextFunction } from 'express';
import { PurchaseService } from '../services/PurchaseService.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class PurchaseController {
  static async createPurchase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const purchase = await PurchaseService.createPurchase(req.body, userId);
      res.status(201).json({ success: true, message: 'Stock purchase recorded successfully', data: purchase });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchases(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await PurchaseService.getPurchases({ search, page, limit });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const purchase = await PurchaseService.getPurchaseById(id);
      res.json({ success: true, data: purchase });
    } catch (error) {
      next(error);
    }
  }
}
