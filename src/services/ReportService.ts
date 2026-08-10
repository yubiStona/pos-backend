import { AppDataSource } from '../config/database.js';
import { Sale } from '../entities/Sale.js';
import { SaleItem } from '../entities/SaleItem.js';
import { Product } from '../entities/Product.js';
import { Purchase } from '../entities/Purchase.js';
import { Category } from '../entities/Category.js';

export class ReportService {
  static async getSalesReport(startDate?: string, endDate?: string) {
    const saleRepo = AppDataSource.getRepository(Sale);
    const qb = saleRepo.createQueryBuilder('sale').leftJoinAndSelect('sale.items', 'items');

    if (startDate) {
      qb.andWhere('sale.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('sale.createdAt <= :endDate', { endDate: end });
    }

    const sales = await qb.getMany();

    let totalSales = 0;
    let totalDiscount = 0;
    let totalItemsSold = 0;
    let estimatedProfit = 0;

    for (const sale of sales) {
      totalSales += Number(sale.total);
      totalDiscount += Number(sale.discount || 0);

      if (sale.items) {
        for (const item of sale.items) {
          const qty = Number(item.quantity);
          totalItemsSold += qty;
          const revenue = Number(item.subtotal);
          const cost = Number(item.purchasePriceSnapshot || 0) * qty;
          estimatedProfit += revenue - cost;
        }
      }
    }

    const numberOfBills = sales.length;
    const averageBillValue = numberOfBills > 0 ? totalSales / numberOfBills : 0;

    return {
      totalSales,
      numberOfBills,
      totalItemsSold,
      totalDiscount,
      averageBillValue,
      estimatedProfit: Math.max(0, estimatedProfit - totalDiscount),
      period: { startDate, endDate },
    };
  }

  static async getProductSalesReport(startDate?: string, endDate?: string) {
    const saleItemRepo = AppDataSource.getRepository(SaleItem);
    const qb = saleItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.sale', 'sale')
      .select('item.productId', 'productId')
      .addSelect('item.productNameSnapshot', 'productName')
      .addSelect('item.skuSnapshot', 'sku')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .addSelect('SUM((item.unitPrice - item.purchasePriceSnapshot) * item.quantity)', 'estimatedProfit')
      .groupBy('item.productId')
      .addGroupBy('item.productNameSnapshot')
      .addGroupBy('item.skuSnapshot')
      .orderBy('quantitySold', 'DESC');

    if (startDate) {
      qb.andWhere('sale.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('sale.createdAt <= :endDate', { endDate: end });
    }

    const rawResults = await qb.getRawMany();

    return rawResults.map((r) => ({
      productId: Number(r.productId),
      productName: r.productName,
      sku: r.sku,
      quantitySold: Number(r.quantitySold || 0),
      totalRevenue: Number(r.totalRevenue || 0),
      estimatedProfit: Number(r.estimatedProfit || 0),
    }));
  }

  static async getCategorySalesReport(startDate?: string, endDate?: string) {
    const saleItemRepo = AppDataSource.getRepository(SaleItem);
    const qb = saleItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.sale', 'sale')
      .leftJoin('item.product', 'product')
      .leftJoin('product.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('totalRevenue', 'DESC');

    if (startDate) {
      qb.andWhere('sale.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('sale.createdAt <= :endDate', { endDate: end });
    }

    const rawResults = await qb.getRawMany();

    return rawResults.map((r) => ({
      categoryId: r.categoryId ? Number(r.categoryId) : 0,
      categoryName: r.categoryName || 'Uncategorized',
      quantitySold: Number(r.quantitySold || 0),
      totalRevenue: Number(r.totalRevenue || 0),
    }));
  }

  static async getStockReport() {
    const productRepo = AppDataSource.getRepository(Product);
    const products = await productRepo.find({
      relations: { category: true },
      order: { stockQuantity: 'ASC' },
    });

    let totalStockValuePurchase = 0;
    let totalStockValueSelling = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const list = products.map((p) => {
      const stock = Number(p.stockQuantity);
      const threshold = Number(p.lowStockThreshold);
      let status = 'IN_STOCK';

      if (stock <= 0) {
        status = 'OUT_OF_STOCK';
        outOfStockCount++;
      } else if (stock <= threshold) {
        status = 'LOW_STOCK';
        lowStockCount++;
      } else {
        inStockCount++;
      }

      const pVal = stock * Number(p.purchasePrice || 0);
      const sVal = stock * Number(p.sellingPrice || 0);
      totalStockValuePurchase += pVal;
      totalStockValueSelling += sVal;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        categoryName: p.category ? p.category.name : 'Uncategorized',
        stockQuantity: stock,
        unit: p.unit,
        lowStockThreshold: threshold,
        purchasePrice: Number(p.purchasePrice),
        sellingPrice: Number(p.sellingPrice),
        stockValuePurchase: pVal,
        stockValueSelling: sVal,
        status,
      };
    });

    return {
      summary: {
        totalProducts: products.length,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        totalStockValuePurchase,
        totalStockValueSelling,
      },
      products: list,
    };
  }

  static async getPurchaseReport(startDate?: string, endDate?: string) {
    const purchaseRepo = AppDataSource.getRepository(Purchase);
    const qb = purchaseRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.supplier', 'supplier')
      .leftJoinAndSelect('p.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (startDate) {
      qb.andWhere('p.purchaseDate >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('p.purchaseDate <= :endDate', { endDate: end });
    }

    const purchases = await qb.orderBy('p.purchaseDate', 'DESC').getMany();

    let totalPurchaseAmount = 0;
    let totalItemsPurchased = 0;

    purchases.forEach((p) => {
      totalPurchaseAmount += Number(p.totalAmount);
      if (p.items) {
        p.items.forEach((item) => {
          totalItemsPurchased += Number(item.quantity);
        });
      }
    });

    return {
      totalPurchases: purchases.length,
      totalPurchaseAmount,
      totalItemsPurchased,
      purchases,
    };
  }
}
