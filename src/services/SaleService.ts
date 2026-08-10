import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { ENV } from '../config/env.js';
import { Sale, PaymentMethod } from '../entities/Sale.js';
import { SaleItem } from '../entities/SaleItem.js';
import { Product } from '../entities/Product.js';
import { StockTransaction, StockTransactionType } from '../entities/StockTransaction.js';
import { AppError } from '../middlewares/error.middleware.js';

export class SaleService {
  private static async generateInvoiceNumber(manager: EntityManager): Promise<string> {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${todayStr}-`;

    const latestSale = await manager
      .createQueryBuilder(Sale, 'sale')
      .where('sale.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('sale.id', 'DESC')
      .getOne();

    let sequence = 1;
    if (latestSale) {
      const parts = latestSale.invoiceNumber.split('-');
      const lastSeqStr = parts[parts.length - 1];
      const parsed = parseInt(lastSeqStr, 10);
      if (!isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    const seqPadded = String(sequence).padStart(4, '0');
    return `${prefix}${seqPadded}`;
  }

  static async createSale(
    data: {
      items: Array<{
        productId: number;
        quantity: number;
      }>;
      discount?: number;
      paymentMethod: PaymentMethod;
      cashReceived?: number;
    },
    userId: number
  ) {
    return await AppDataSource.transaction(async (manager: EntityManager) => {
      if (!data.items || data.items.length === 0) {
        throw new AppError('Cannot create sale with empty cart', 400);
      }

      const invoiceNumber = await SaleService.generateInvoiceNumber(manager);

      let subtotal = 0;
      const saleItemsData: SaleItem[] = [];

      for (const itemInput of data.items) {
        const product = await manager.findOne(Product, {
          where: { id: itemInput.productId },
          ...(ENV.DB_TYPE === 'mysql' ? { lock: { mode: 'pessimistic_write' as const } } : {}),
        });

        if (!product) {
          throw new AppError(`Product ID ${itemInput.productId} not found`, 400);
        }

        if (!product.isActive) {
          throw new AppError(`Product "${product.name}" is deactivated`, 400);
        }

        const requestedQty = Number(itemInput.quantity);
        const availableStock = Number(product.stockQuantity);

        // Stock Validation
        if (availableStock < requestedQty) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Available: ${availableStock} ${product.unit}, Requested: ${requestedQty}`,
            400
          );
        }

        const unitPrice = Number(product.sellingPrice);
        const purchasePriceSnapshot = Number(product.purchasePrice || 0);
        const itemSubtotal = requestedQty * unitPrice;
        subtotal += itemSubtotal;

        const previousStock = availableStock;
        const newStock = previousStock - requestedQty;

        // Decrease stock
        product.stockQuantity = newStock;
        await manager.save(Product, product);

        // Create SALE stock transaction
        const st = manager.create(StockTransaction, {
          productId: product.id,
          type: StockTransactionType.SALE,
          quantity: -requestedQty,
          previousStock,
          newStock,
          referenceId: invoiceNumber,
          note: `Sold via POS Invoice ${invoiceNumber}`,
          createdById: userId,
        });
        await manager.save(StockTransaction, st);

        const saleItem = manager.create(SaleItem, {
          productId: product.id,
          productNameSnapshot: product.name,
          skuSnapshot: product.sku,
          quantity: requestedQty,
          unitPrice,
          purchasePriceSnapshot,
          subtotal: itemSubtotal,
        });

        saleItemsData.push(saleItem);
      }

      const discount = Number(data.discount || 0);
      const total = Math.max(0, subtotal - discount);
      const cashReceived = Number(data.cashReceived || 0);
      const changeAmount = data.paymentMethod === PaymentMethod.CASH ? Math.max(0, cashReceived - total) : 0;

      const sale = manager.create(Sale, {
        invoiceNumber,
        subtotal,
        discount,
        total,
        paymentMethod: data.paymentMethod,
        cashReceived: data.paymentMethod === PaymentMethod.CASH ? cashReceived : total,
        changeAmount,
        createdById: userId,
        items: saleItemsData,
      });

      const savedSale = await manager.save(Sale, sale);

      return await manager.findOne(Sale, {
        where: { id: savedSale.id },
        relations: { items: { product: true }, createdBy: true },
      });
    });
  }

  static async getSales(params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    paymentMethod?: PaymentMethod;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const saleRepo = AppDataSource.getRepository(Sale);
    const queryBuilder = saleRepo
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.createdBy', 'createdBy')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (params.search) {
      const s = `%${params.search.toLowerCase()}%`;
      queryBuilder.andWhere('LOWER(sale.invoiceNumber) LIKE :s', { s });
    }

    if (params.paymentMethod) {
      queryBuilder.andWhere('sale.paymentMethod = :pm', { pm: params.paymentMethod });
    }

    if (params.startDate) {
      queryBuilder.andWhere('sale.createdAt >= :startDate', { startDate: new Date(params.startDate) });
    }

    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('sale.createdAt <= :endDate', { endDate: end });
    }

    queryBuilder.orderBy('sale.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getSaleById(id: number) {
    const saleRepo = AppDataSource.getRepository(Sale);
    const sale = await saleRepo.findOne({
      where: { id },
      relations: { items: { product: true }, createdBy: true },
    });

    if (!sale) {
      throw new AppError('Sale transaction not found', 404);
    }

    return sale;
  }
}
