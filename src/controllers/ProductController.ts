import { Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class ProductController {
  static async getProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string;
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const result = await ProductService.getProducts({ search, categoryId, isActive, page, limit });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getProductByBarcode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const barcode = req.params.barcode;
      const product = await ProductService.getProductByBarcode(barcode);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const product = await ProductService.getProductById(id);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const product = await ProductService.createProduct(req.body, userId);
      res.status(201).json({ success: true, message: 'Product created successfully', data: product });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const product = await ProductService.updateProduct(id, req.body);
      res.json({ success: true, message: 'Product updated successfully', data: product });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await ProductService.deactivateProduct(id);
      res.json({ success: true, message: 'Product deactivated successfully' });
    } catch (error) {
      next(error);
    }
  }
}
