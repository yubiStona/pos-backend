import { AppDataSource } from '../config/database.js';
import { Sale } from '../entities/Sale.js';
import { Product } from '../entities/Product.js';
import { SaleItem } from '../entities/SaleItem.js';

export class DashboardService {
  static async getDashboardSummary() {
    const saleRepo = AppDataSource.getRepository(Sale);
    const productRepo = AppDataSource.getRepository(Product);

    // Today range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Today sales
    const todaySales = await saleRepo
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items')
      .where('sale.createdAt >= :todayStart AND sale.createdAt <= :todayEnd', { todayStart, todayEnd })
      .getMany();

    let todaysSalesTotal = 0;
    let todaysItemsSold = 0;
    let todaysEstimatedProfit = 0;

    for (const sale of todaySales) {
      todaysSalesTotal += Number(sale.total);
      if (sale.items) {
        for (const item of sale.items) {
          const qty = Number(item.quantity);
          todaysItemsSold += qty;
          const revenue = Number(item.subtotal);
          const cost = Number(item.purchasePriceSnapshot || 0) * qty;
          todaysEstimatedProfit += revenue - cost;
        }
      }
    }

    // Low Stock Products
    const lowStockProducts = await productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.stockQuantity <= product.lowStockThreshold')
      .orderBy('product.stockQuantity', 'ASC')
      .take(10)
      .getMany();

    // Recent Sales
    const recentSales = await saleRepo.find({
      relations: { createdBy: true },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Top Selling Products (all-time/month)
    const saleItemRepo = AppDataSource.getRepository(SaleItem);
    const topProductsRaw = await saleItemRepo
      .createQueryBuilder('item')
      .select('item.productId', 'productId')
      .addSelect('item.productNameSnapshot', 'productName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .groupBy('item.productId')
      .addGroupBy('item.productNameSnapshot')
      .orderBy('totalQuantity', 'DESC')
      .limit(5)
      .getRawMany();

    const topSellingProducts = topProductsRaw.map((r) => ({
      productId: Number(r.productId),
      productName: r.productName,
      totalQuantity: Number(r.totalQuantity || 0),
      totalRevenue: Number(r.totalRevenue || 0),
    }));

    // 7-day Sales Trend
    const last7DaysTrend: Array<{ date: string; sales: number; count: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);

      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const daySales = await saleRepo
        .createQueryBuilder('sale')
        .where('sale.createdAt >= :dStart AND sale.createdAt <= :dEnd', { dStart, dEnd })
        .getMany();

      const dayTotal = daySales.reduce((acc, s) => acc + Number(s.total), 0);

      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      last7DaysTrend.push({
        date: dateLabel,
        sales: dayTotal,
        count: daySales.length,
      });
    }

    return {
      todaysSalesTotal,
      todaysTransactionsCount: todaySales.length,
      todaysItemsSold,
      todaysEstimatedProfit: Math.max(0, todaysEstimatedProfit),
      lowStockProducts,
      recentSales,
      topSellingProducts,
      last7DaysTrend,
    };
  }
}
