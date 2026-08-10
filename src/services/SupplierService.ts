import { getSupplierRepository } from '../repositories/repositories.js';
import { Supplier } from '../entities/Supplier.js';
import { AppError } from '../middlewares/error.middleware.js';

export class SupplierService {
  static async getAllSuppliers() {
    const supplierRepo = getSupplierRepository();
    return await supplierRepo.find({
      order: { name: 'ASC' },
    });
  }

  static async getSupplierById(id: number) {
    const supplierRepo = getSupplierRepository();
    const supplier = await supplierRepo.findOne({
      where: { id },
      relations: { purchases: true },
    });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }
    return supplier;
  }

  static async createSupplier(data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
  }) {
    const supplierRepo = getSupplierRepository();

    const supplier = supplierRepo.create({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      address: data.address || undefined,
      notes: data.notes || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return await supplierRepo.save(supplier);
  }

  static async updateSupplier(
    id: number,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      isActive?: boolean;
    }
  ) {
    const supplierRepo = getSupplierRepository();
    const supplier = await supplierRepo.findOne({ where: { id } });

    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    if (data.name !== undefined) supplier.name = data.name;
    if (data.phone !== undefined) supplier.phone = data.phone;
    if (data.email !== undefined) supplier.email = data.email;
    if (data.address !== undefined) supplier.address = data.address;
    if (data.notes !== undefined) supplier.notes = data.notes;
    if (data.isActive !== undefined) supplier.isActive = data.isActive;

    return await supplierRepo.save(supplier);
  }
}
