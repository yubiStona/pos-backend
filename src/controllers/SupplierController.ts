import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/SupplierService.js';

export class SupplierController {
  static async getAllSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const suppliers = await SupplierService.getAllSuppliers();
      res.json({ success: true, data: suppliers });
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const supplier = await SupplierService.getSupplierById(id);
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SupplierService.createSupplier(req.body);
      res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
    } catch (error) {
      next(error);
    }
  }

  static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const supplier = await SupplierService.updateSupplier(id, req.body);
      res.json({ success: true, message: 'Supplier updated successfully', data: supplier });
    } catch (error) {
      next(error);
    }
  }
}
