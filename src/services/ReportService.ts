import { AppDataSource } from '../config/database.js';
import { Sale } from '../entities/Sale.js';
import { SaleItem } from '../entities/SaleItem.js';
import { Product } from '../entities/Product.js';
import { Purchase } from '../entities/Purchase.js';

function resolveDateRange(startDate?: string, endDate?: string) {
  const start = startDate ? new Date(startDate) : undefined;
  if (start) start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : undefined;
  if (end) end.setHours(23, 59, 59, 999);

  return { start, end };
}

export class ReportService {
  static async getSalesReport(startDate?: string, endDate?: string) {
    const saleRepo = AppDataSource.getRepository(Sale);
    const { start, end } = resolveDateRange(startDate, endDate);

    const qb = saleRepo.createQueryBuilder('sale').leftJoinAndSelect('sale.items', 'items');
    if (start) qb.andWhere('sale.createdAt >= :start', { start });
    if (end) qb.andWhere('sale.createdAt <= :end', { end });

    const sales = await qb.orderBy('sale.createdAt', 'ASC').getMany();

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalItemsSold = 0;
    let grossProfit = 0;

    // Bucket sales by calendar day for the trend chart.
    const trendMap = new Map<string, { sales: number; count: number }>();

    for (const sale of sales) {
      totalRevenue += Number(sale.total);
      totalDiscount += Number(sale.discount || 0);

      if (sale.items) {
        for (const item of sale.items) {
          const qty = Number(item.quantity);
          totalItemsSold += qty;
          const revenue = Number(item.subtotal);
          const cost = Number(item.purchasePriceSnapshot || 0) * qty;
          grossProfit += revenue - cost;
        }
      }

      const dayKey = new Date(sale.createdAt).toISOString().slice(0, 10);
      const bucket = trendMap.get(dayKey) || { sales: 0, count: 0 };
      bucket.sales += Number(sale.total);
      bucket.count += 1;
      trendMap.set(dayKey, bucket);
    }

    const dailyTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([dayKey, v]) => ({
        date: new Date(dayKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: v.sales,
        count: v.count,
      }));

    const totalOrders = sales.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      totalItemsSold,
      totalDiscount,
      averageOrderValue,
      grossProfit: Math.max(0, grossProfit - totalDiscount),
      dailyTrend,
      period: { startDate, endDate },
    };
  }

  static async getProductSalesReport(startDate?: string, endDate?: string) {
    const saleItemRepo = AppDataSource.getRepository(SaleItem);
    const { start, end } = resolveDateRange(startDate, endDate);

    const qb = saleItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.sale', 'sale')
      .leftJoin('item.product', 'product')
      .select('item.productId', 'productId')
      .addSelect('item.productNameSnapshot', 'productName')
      .addSelect('item.skuSnapshot', 'sku')
      .addSelect('product.barcode', 'barcode')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .addSelect('SUM((item.unitPrice - item.purchasePriceSnapshot) * item.quantity)', 'estimatedProfit')
      .groupBy('item.productId')
      .addGroupBy('item.productNameSnapshot')
      .addGroupBy('item.skuSnapshot')
      .addGroupBy('product.barcode')
      .orderBy('totalQuantity', 'DESC');

    if (start) qb.andWhere('sale.createdAt >= :start', { start });
    if (end) qb.andWhere('sale.createdAt <= :end', { end });

    const rawResults = await qb.getRawMany();

    return rawResults.map((r) => ({
      productId: Number(r.productId),
      productName: r.productName,
      sku: r.sku,
      barcode: r.barcode,
      totalQuantity: Number(r.totalQuantity || 0),
      totalRevenue: Number(r.totalRevenue || 0),
      estimatedProfit: Number(r.estimatedProfit || 0),
    }));
  }

  static async getCategorySalesReport(startDate?: string, endDate?: string) {
    const saleItemRepo = AppDataSource.getRepository(SaleItem);
    const { start, end } = resolveDateRange(startDate, endDate);

    const qb = saleItemRepo
      .createQueryBuilder('item')
      .leftJoin('item.sale', 'sale')
      .leftJoin('item.product', 'product')
      .leftJoin('product.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('totalRevenue', 'DESC');

    if (start) qb.andWhere('sale.createdAt >= :start', { start });
    if (end) qb.andWhere('sale.createdAt <= :end', { end });

    const rawResults = await qb.getRawMany();

    return rawResults.map((r) => ({
      categoryId: r.categoryId ? Number(r.categoryId) : 0,
      categoryName: r.categoryName || 'Uncategorized',
      totalQuantity: Number(r.totalQuantity || 0),
      totalRevenue: Number(r.totalRevenue || 0),
    }));
  }

  static async getStockReport() {
    const productRepo = AppDataSource.getRepository(Product);
    const products = await productRepo.find({
      relations: { category: true },
      order: { stockQuantity: 'ASC' },
    });

    let totalInventoryCostValue = 0;
    let totalInventorySalesValue = 0;
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
      totalInventoryCostValue += pVal;
      totalInventorySalesValue += sVal;

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
      totalProducts: products.length,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalInventoryCostValue,
      totalInventorySalesValue,
      products: list,
    };
  }

  static async getPurchaseReport(startDate?: string, endDate?: string) {
    const purchaseRepo = AppDataSource.getRepository(Purchase);
    const { start, end } = resolveDateRange(startDate, endDate);

    const qb = purchaseRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.supplier', 'supplier')
      .leftJoinAndSelect('p.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (start) qb.andWhere('p.purchaseDate >= :start', { start });
    if (end) qb.andWhere('p.purchaseDate <= :end', { end });

    const purchases = await qb.orderBy('p.purchaseDate', 'DESC').getMany();

    let totalPurchaseCost = 0;
    let totalItemsPurchased = 0;

    purchases.forEach((p) => {
      totalPurchaseCost += Number(p.totalAmount);
      if (p.items) {
        p.items.forEach((item) => {
          totalItemsPurchased += Number(item.quantity);
        });
      }
    });

    return {
      totalOrders: purchases.length,
      totalPurchaseCost,
      totalItemsPurchased,
      purchases,
    };
  }

  /**
   * Resolves a daily/weekly/monthly window around a reference date.
   * - daily: the reference date only
   * - weekly: the Mon-Sun week containing the reference date
   * - monthly: the calendar month containing the reference date
   */
  static resolvePeriodRange(period: 'daily' | 'weekly' | 'monthly', referenceDate?: string) {
    const ref = referenceDate ? new Date(referenceDate) : new Date();

    if (period === 'daily') {
      const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
      const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
      return { start, end, label: start.toLocaleDateString('en-CA') };
    }

    if (period === 'weekly') {
      const day = ref.getDay(); // 0 = Sunday
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diffToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: `${start.toLocaleDateString('en-CA')}_to_${end.toLocaleDateString('en-CA')}` };
    }

    // monthly
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  }

  /** Builds a downloadable CSV covering a daily/weekly/monthly sales report. */
  static async buildSalesReportCsv(period: 'daily' | 'weekly' | 'monthly', referenceDate?: string) {
    const { start, end, label } = this.resolvePeriodRange(period, referenceDate);
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    const [summary, products] = await Promise.all([
      this.getSalesReport(startIso, endIso),
      this.getProductSalesReport(startIso, endIso),
    ]);

    const rows: string[] = [];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    rows.push(`Small-Mart Sales Report (${period[0].toUpperCase()}${period.slice(1)})`);
    rows.push(`Period,${esc(label)}`);
    rows.push(`From,${esc(startIso)}`);
    rows.push(`To,${esc(endIso)}`);
    rows.push('');
    rows.push('Summary');
    rows.push('Metric,Value');
    rows.push(`Total Revenue,${summary.totalRevenue.toFixed(2)}`);
    rows.push(`Estimated Gross Profit,${summary.grossProfit.toFixed(2)}`);
    rows.push(`Total Orders,${summary.totalOrders}`);
    rows.push(`Total Items Sold,${summary.totalItemsSold}`);
    rows.push(`Total Discount,${summary.totalDiscount.toFixed(2)}`);
    rows.push(`Average Order Value,${summary.averageOrderValue.toFixed(2)}`);
    rows.push('');
    rows.push('Daily Breakdown');
    rows.push('Date,Sales,Orders');
    for (const d of summary.dailyTrend) {
      rows.push(`${esc(d.date)},${d.sales.toFixed(2)},${d.count}`);
    }
    rows.push('');
    rows.push('Product Breakdown');
    rows.push('Product Name,SKU,Barcode,Quantity Sold,Revenue,Estimated Profit');
    for (const p of products) {
      rows.push(
        `${esc(p.productName)},${esc(p.sku)},${esc(p.barcode)},${p.totalQuantity},${p.totalRevenue.toFixed(2)},${p.estimatedProfit.toFixed(2)}`
      );
    }

    return {
      csv: rows.join('\n'),
      filename: `small-mart-sales-report-${period}-${startIso}${period !== 'daily' ? `_to_${endIso}` : ''}.csv`,
    };
  }
}
