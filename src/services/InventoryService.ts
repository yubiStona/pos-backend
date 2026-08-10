import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { ENV } from '../config/env.js';
import { Product } from '../entities/Product.js';
import { StockTransaction, StockTransactionType } from '../entities/StockTransaction.js';
import { AppError } from '../middlewares/error.middleware.js';

export class InventoryService {
  static async adjustStock(
    productId: number,
    quantity: number,
    type: StockTransactionType,
    note: string | undefined,
    userId: number
  ) {
    return await AppDataSource.transaction(async (transactionalEntityManager: EntityManager) => {
      const product = await transactionalEntityManager.findOne(Product, {
        where: { id: productId },
        ...(ENV.DB_TYPE === 'mysql' ? { lock: { mode: 'pessimistic_write' as const } } : {}),
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      const previousStock = Number(product.stockQuantity);
      let newStock = previousStock;

      if (type === StockTransactionType.ADJUSTMENT || type === StockTransactionType.PURCHASE || type === StockTransactionType.OPENING_STOCK || type === StockTransactionType.SALE_RETURN) {
        newStock = previousStock + Number(quantity);
      } else if (type === StockTransactionType.SALE || type === StockTransactionType.DAMAGE) {
        newStock = previousStock - Number(quantity);
      } else {
        newStock = previousStock + Number(quantity);
      }

      if (newStock < 0) {
        throw new AppError(`Stock adjustment result cannot be negative (Current: ${previousStock}, Requested change: ${quantity})`, 400);
      }

      product.stockQuantity = newStock;
      await transactionalEntityManager.save(Product, product);

      const st = transactionalEntityManager.create(StockTransaction, {
        productId,
        type,
        quantity: Number(quantity),
        previousStock,
        newStock,
        note: note || `Manual stock adjustment (${type})`,
        createdById: userId,
      });

      await transactionalEntityManager.save(StockTransaction, st);

      return {
        product,
        stockTransaction: st,
      };
    });
  }

  static async getStockHistory(productId: number) {
    const stRepo = AppDataSource.getRepository(StockTransaction);
    return await stRepo.find({
      where: { productId },
      relations: { createdBy: true, product: true },
      order: { createdAt: 'DESC' },
    });
  }

  static async getStockOverview(params: { search?: string; status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' }) {
    const productRepo = AppDataSource.getRepository(Product);
    const queryBuilder = productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true });

    if (params.search) {
      const s = `%${params.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(product.name) LIKE :s OR LOWER(product.sku) LIKE :s OR LOWER(product.barcode) LIKE :s)',
        { s }
      );
    }

    if (params.status === 'OUT_OF_STOCK') {
      queryBuilder.andWhere('product.stockQuantity <= 0');
    } else if (params.status === 'LOW_STOCK') {
      queryBuilder.andWhere('product.stockQuantity > 0 AND product.stockQuantity <= product.lowStockThreshold');
    } else if (params.status === 'IN_STOCK') {
      queryBuilder.andWhere('product.stockQuantity > product.lowStockThreshold');
    }

    queryBuilder.orderBy('product.stockQuantity', 'ASC');

    const products = await queryBuilder.getMany();

    return products.map((p) => {
      let status = 'IN_STOCK';
      if (p.stockQuantity <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (p.stockQuantity <= p.lowStockThreshold) {
        status = 'LOW_STOCK';
      }
      return {
        ...p,
        stockStatus: status,
      };
    });
  }
}
