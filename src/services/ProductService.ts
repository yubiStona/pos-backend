import { getProductRepository, getCategoryRepository, getStockTransactionRepository } from '../repositories/repositories.js';
import { Product, ProductUnit } from '../entities/Product.js';
import { StockTransaction, StockTransactionType } from '../entities/StockTransaction.js';
import { AppError } from '../middlewares/error.middleware.js';

export class ProductService {
  static async getProducts(params: {
    search?: string;
    categoryId?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const productRepo = getProductRepository();
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    if (params.isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive: params.isActive });
    }

    if (params.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: params.categoryId });
    }

    if (params.search && params.search.trim() !== '') {
      const searchTerm = `%${params.search.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(product.name) LIKE :search OR LOWER(product.sku) LIKE :search OR LOWER(product.barcode) LIKE :search OR LOWER(product.brand) LIKE :search)',
        { search: searchTerm }
      );
    }

    queryBuilder.orderBy('product.name', 'ASC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getProductByBarcode(barcode: string) {
    const productRepo = getProductRepository();
    const product = await productRepo.findOne({
      where: { barcode },
      relations: { category: true },
    });

    if (!product) {
      throw new AppError(`Product with barcode "${barcode}" not found`, 404);
    }

    return product;
  }

  static async getProductById(id: number) {
    const productRepo = getProductRepository();
    const product = await productRepo.findOne({
      where: { id },
      relations: { category: true, stockTransactions: true },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return product;
  }

  static async createProduct(
    data: {
      name: string;
      sku: string;
      barcode: string;
      categoryId: number;
      brand?: string;
      unit?: ProductUnit;
      purchasePrice: number;
      sellingPrice: number;
      stockQuantity: number;
      lowStockThreshold?: number;
      expiryDate?: string | null;
      description?: string;
      isActive?: boolean;
    },
    userId?: number
  ) {
    const productRepo = getProductRepository();
    const categoryRepo = getCategoryRepository();

    const category = await categoryRepo.findOne({ where: { id: data.categoryId } });
    if (!category) {
      throw new AppError('Invalid category ID', 400);
    }

    const existingSku = await productRepo.findOne({ where: { sku: data.sku } });
    if (existingSku) {
      throw new AppError(`Product SKU "${data.sku}" already exists`, 400);
    }

    const existingBarcode = await productRepo.findOne({ where: { barcode: data.barcode } });
    if (existingBarcode) {
      throw new AppError(`Product Barcode "${data.barcode}" already exists`, 400);
    }

    const product = productRepo.create({
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      categoryId: data.categoryId,
      brand: data.brand || undefined,
      unit: data.unit || ProductUnit.PCS,
      purchasePrice: Number(data.purchasePrice),
      sellingPrice: Number(data.sellingPrice),
      stockQuantity: Number(data.stockQuantity || 0),
      lowStockThreshold: Number(data.lowStockThreshold || 5),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      description: data.description || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    const savedProduct = await productRepo.save(product);

    // Record opening stock transaction if stockQuantity > 0
    if (savedProduct.stockQuantity > 0) {
      const stockRepo = getStockTransactionRepository();
      const st = stockRepo.create({
        productId: savedProduct.id,
        type: StockTransactionType.OPENING_STOCK,
        quantity: savedProduct.stockQuantity,
        previousStock: 0,
        newStock: savedProduct.stockQuantity,
        note: 'Opening Stock recorded at product creation',
        createdById: userId,
      });
      await stockRepo.save(st);
    }

    return savedProduct;
  }

  static async updateProduct(
    id: number,
    data: {
      name?: string;
      sku?: string;
      barcode?: string;
      categoryId?: number;
      brand?: string;
      unit?: ProductUnit;
      purchasePrice?: number;
      sellingPrice?: number;
      lowStockThreshold?: number;
      expiryDate?: string | null;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const productRepo = getProductRepository();
    const product = await productRepo.findOne({ where: { id } });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (data.sku && data.sku !== product.sku) {
      const existingSku = await productRepo.findOne({ where: { sku: data.sku } });
      if (existingSku) throw new AppError(`SKU "${data.sku}" is already in use`, 400);
      product.sku = data.sku;
    }

    if (data.barcode && data.barcode !== product.barcode) {
      const existingBarcode = await productRepo.findOne({ where: { barcode: data.barcode } });
      if (existingBarcode) throw new AppError(`Barcode "${data.barcode}" is already in use`, 400);
      product.barcode = data.barcode;
    }

    if (data.name !== undefined) product.name = data.name;
    if (data.categoryId !== undefined) product.categoryId = data.categoryId;
    if (data.brand !== undefined) product.brand = data.brand;
    if (data.unit !== undefined) product.unit = data.unit;
    if (data.purchasePrice !== undefined) product.purchasePrice = Number(data.purchasePrice);
    if (data.sellingPrice !== undefined) product.sellingPrice = Number(data.sellingPrice);
    if (data.lowStockThreshold !== undefined) product.lowStockThreshold = Number(data.lowStockThreshold);
    if (data.expiryDate !== undefined) product.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    if (data.description !== undefined) product.description = data.description;
    if (data.isActive !== undefined) product.isActive = data.isActive;

    return await productRepo.save(product);
  }

  static async deactivateProduct(id: number) {
    const productRepo = getProductRepository();
    const product = await productRepo.findOne({ where: { id } });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    product.isActive = false;
    await productRepo.save(product);
    return true;
  }
}
