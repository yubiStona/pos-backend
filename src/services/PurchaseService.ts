import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { ENV } from '../config/env.js';
import { Purchase } from '../entities/Purchase.js';
import { PurchaseItem } from '../entities/PurchaseItem.js';
import { Product } from '../entities/Product.js';
import { Supplier } from '../entities/Supplier.js';
import { StockTransaction, StockTransactionType } from '../entities/StockTransaction.js';
import { AppError } from '../middlewares/error.middleware.js';

export class PurchaseService {
  static async createPurchase(
    data: {
      supplierId: number;
      invoiceNumber: string;
      purchaseDate?: string;
      note?: string;
      items: Array<{
        productId: number;
        quantity: number;
        unitPurchasePrice: number;
      }>;
    },
    userId: number
  ) {
    return await AppDataSource.transaction(async (manager: EntityManager) => {
      // 1. Verify supplier
      const supplier = await manager.findOne(Supplier, { where: { id: data.supplierId } });
      if (!supplier) {
        throw new AppError('Supplier not found', 400);
      }

      // 2. Verify unique invoiceNumber
      const existingInv = await manager.findOne(Purchase, { where: { invoiceNumber: data.invoiceNumber } });
      if (existingInv) {
        throw new AppError(`Purchase Ref/Invoice "${data.invoiceNumber}" already recorded`, 400);
      }

      let totalAmount = 0;
      const purchaseItemsData: PurchaseItem[] = [];

      // 3. Process each item & update product stock + stock transaction
      for (const itemInput of data.items) {
        const product = await manager.findOne(Product, {
          where: { id: itemInput.productId },
          ...(ENV.DB_TYPE === 'mysql' ? { lock: { mode: 'pessimistic_write' as const } } : {}),
        });

        if (!product) {
          throw new AppError(`Product ID ${itemInput.productId} not found`, 400);
        }

        const qty = Number(itemInput.quantity);
        const unitPrice = Number(itemInput.unitPurchasePrice);
        const subtotal = qty * unitPrice;
        totalAmount += subtotal;

        const previousStock = Number(product.stockQuantity);
        const newStock = previousStock + qty;

        // Update product stock and purchase price
        product.stockQuantity = newStock;
        if (unitPrice > 0) {
          product.purchasePrice = unitPrice;
        }
        await manager.save(Product, product);

        // Record stock transaction
        const st = manager.create(StockTransaction, {
          productId: product.id,
          type: StockTransactionType.PURCHASE,
          quantity: qty,
          previousStock,
          newStock,
          referenceId: data.invoiceNumber,
          note: `Stock In from Supplier ${supplier.name} (Ref: ${data.invoiceNumber})`,
          createdById: userId,
        });
        await manager.save(StockTransaction, st);

        const purchaseItem = manager.create(PurchaseItem, {
          productId: product.id,
          quantity: qty,
          unitPurchasePrice: unitPrice,
          subtotal,
        });
        purchaseItemsData.push(purchaseItem);
      }

      // 4. Save Purchase record
      const purchase = manager.create(Purchase, {
        invoiceNumber: data.invoiceNumber,
        supplierId: supplier.id,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        totalAmount,
        note: data.note || undefined,
        createdById: userId,
        items: purchaseItemsData,
      });

      const savedPurchase = await manager.save(Purchase, purchase);
      return savedPurchase;
    });
  }

  static async getPurchases(params: { search?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const purchaseRepo = AppDataSource.getRepository(Purchase);
    const queryBuilder = purchaseRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.supplier', 'supplier')
      .leftJoinAndSelect('p.createdBy', 'createdBy')
      .leftJoinAndSelect('p.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (params.search) {
      const s = `%${params.search.toLowerCase()}%`;
      queryBuilder.andWhere('(LOWER(p.invoiceNumber) LIKE :s OR LOWER(supplier.name) LIKE :s)', { s });
    }

    queryBuilder.orderBy('p.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getPurchaseById(id: number) {
    const purchaseRepo = AppDataSource.getRepository(Purchase);
    const purchase = await purchaseRepo.findOne({
      where: { id },
      relations: { supplier: true, createdBy: true, items: { product: true } },
    });

    if (!purchase) {
      throw new AppError('Purchase order not found', 404);
    }

    return purchase;
  }
}
