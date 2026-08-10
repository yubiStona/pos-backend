import { Response, NextFunction } from 'express';
import { InventoryService } from '../services/InventoryService.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class StockController {
  static async adjustStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { productId, quantity, type, note } = req.body;
      const userId = req.user!.id;
      const result = await InventoryService.adjustStock(productId, quantity, type, note, userId);
      res.json({ success: true, message: 'Stock adjusted successfully', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getStockHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const productId = Number(req.params.productId);
      const history = await InventoryService.getStockHistory(productId);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  static async getStockOverview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const status = req.query.status as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | undefined;
      const overview = await InventoryService.getStockOverview({ search, status });
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }
}
