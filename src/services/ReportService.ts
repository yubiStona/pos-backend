import { AppDataSource } from '../config/database.js';
import { Sale } from '../entities/Sale.js';
import { SaleItem } from '../entities/SaleItem.js';
import { Product } from '../entities/Product.js';
import { Purchase } from '../entities/Purchase.js';
import { AppError } from '../middlewares/error.middleware.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

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
   * Resolves a daily/weekly/monthly/custom window.
   * - daily: the reference date only
   * - weekly: the Mon-Sun week containing the reference date
   * - monthly: the calendar month containing the reference date
   * - custom: the exact startDate/endDate given
   */
  static resolvePeriodRange(
    period: 'daily' | 'weekly' | 'monthly' | 'custom',
    referenceDate?: string,
    customStart?: string,
    customEnd?: string
  ) {
    if (period === 'custom') {
      if (!customStart || !customEnd) {
        throw new AppError('startDate and endDate are required for a custom report', 400);
      }
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      if (start > end) {
        throw new AppError('startDate must be before endDate', 400);
      }
      return {
        start,
        end,
        label: `${start.toLocaleDateString('en-CA')}_to_${end.toLocaleDateString('en-CA')}`,
      };
    }

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

  private static async gatherReportData(
    period: 'daily' | 'weekly' | 'monthly' | 'custom',
    referenceDate?: string,
    customStart?: string,
    customEnd?: string
  ) {
    const { start, end, label } = this.resolvePeriodRange(period, referenceDate, customStart, customEnd);
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    const [summary, products] = await Promise.all([
      this.getSalesReport(startIso, endIso),
      this.getProductSalesReport(startIso, endIso),
    ]);

    const periodLabel = period === 'custom' ? 'Custom Range' : `${period[0].toUpperCase()}${period.slice(1)}`;
    const baseFilename = `small-mart-sales-report-${period}-${startIso}${
      period !== 'daily' ? `_to_${endIso}` : ''
    }`;

    return { summary, products, startIso, endIso, label, periodLabel, baseFilename };
  }

  /** Builds a downloadable XLSX workbook covering a daily/weekly/monthly/custom sales report. */
  static async buildSalesReportXlsx(
    period: 'daily' | 'weekly' | 'monthly' | 'custom',
    referenceDate?: string,
    customStart?: string,
    customEnd?: string
  ) {
    const { summary, products, startIso, endIso, periodLabel, baseFilename } = await this.gatherReportData(
      period,
      referenceDate,
      customStart,
      customEnd
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Small-Mart POS';
    workbook.created = new Date();

    // --- Summary sheet ---
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.addRows([
      { metric: 'Report Type', value: `${periodLabel} Sales Report` },
      { metric: 'From', value: startIso },
      { metric: 'To', value: endIso },
      { metric: '', value: '' },
      { metric: 'Total Revenue', value: summary.totalRevenue },
      { metric: 'Estimated Gross Profit', value: summary.grossProfit },
      { metric: 'Total Orders', value: summary.totalOrders },
      { metric: 'Total Items Sold', value: summary.totalItemsSold },
      { metric: 'Total Discount', value: summary.totalDiscount },
      { metric: 'Average Order Value', value: summary.averageOrderValue },
    ]);

    // --- Daily breakdown sheet ---
    const dailySheet = workbook.addWorksheet('Daily Breakdown');
    dailySheet.columns = [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Sales', key: 'sales', width: 16 },
      { header: 'Orders', key: 'count', width: 12 },
    ];
    dailySheet.getRow(1).font = { bold: true };
    for (const d of summary.dailyTrend) {
      dailySheet.addRow({ date: d.date, sales: d.sales, count: d.count });
    }

    // --- Product breakdown sheet ---
    const productSheet = workbook.addWorksheet('Product Breakdown');
    productSheet.columns = [
      { header: 'Product Name', key: 'productName', width: 32 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Barcode', key: 'barcode', width: 18 },
      { header: 'Quantity Sold', key: 'totalQuantity', width: 16 },
      { header: 'Revenue', key: 'totalRevenue', width: 16 },
      { header: 'Estimated Profit', key: 'estimatedProfit', width: 18 },
    ];
    productSheet.getRow(1).font = { bold: true };
    for (const p of products) {
      productSheet.addRow(p);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), filename: `${baseFilename}.xlsx` };
  }

  /** Builds a downloadable PDF covering a daily/weekly/monthly/custom sales report. */
  static async buildSalesReportPdf(
    period: 'daily' | 'weekly' | 'monthly' | 'custom',
    referenceDate?: string,
    customStart?: string,
    customEnd?: string
  ) {
    const { summary, products, startIso, endIso, periodLabel, baseFilename } = await this.gatherReportData(
      period,
      referenceDate,
      customStart,
      customEnd
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(18).font('Helvetica-Bold').text('Small-Mart Sales Report', { align: 'left' });
    doc.fontSize(11).font('Helvetica').fillColor('#555').text(`${periodLabel} \u2014 ${startIso} to ${endIso}`);
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#000').text('Summary');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    const summaryLines: [string, string][] = [
      ['Total Revenue', `Rs. ${summary.totalRevenue.toFixed(2)}`],
      ['Estimated Gross Profit', `Rs. ${summary.grossProfit.toFixed(2)}`],
      ['Total Orders', `${summary.totalOrders}`],
      ['Total Items Sold', `${summary.totalItemsSold}`],
      ['Total Discount', `Rs. ${summary.totalDiscount.toFixed(2)}`],
      ['Average Order Value', `Rs. ${summary.averageOrderValue.toFixed(2)}`],
    ];
    for (const [label, value] of summaryLines) {
      doc.text(`${label}:  ${value}`);
    }
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').text('Daily Breakdown');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    if (summary.dailyTrend.length === 0) {
      doc.fillColor('#888').text('No sales in this period.');
      doc.fillColor('#000');
    } else {
      for (const d of summary.dailyTrend) {
        doc.text(`${d.date}   Rs. ${d.sales.toFixed(2)}   (${d.count} orders)`);
      }
    }
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').text('Product Breakdown');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    if (products.length === 0) {
      doc.fillColor('#888').text('No product sales in this period.');
      doc.fillColor('#000');
    } else {
      for (const p of products) {
        doc.text(
          `${p.productName} (${p.sku})   Qty: ${p.totalQuantity}   Revenue: Rs. ${p.totalRevenue.toFixed(
            2
          )}   Profit: Rs. ${p.estimatedProfit.toFixed(2)}`
        );
      }
    }

    doc.end();
    const buffer = await done;
    return { buffer, filename: `${baseFilename}.pdf` };
  }
}
