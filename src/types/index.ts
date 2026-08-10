export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
}

export enum ProductUnit {
  PCS = 'PCS',
  KG = 'KG',
  GRAM = 'GRAM',
  LITER = 'LITER',
  ML = 'ML',
  PACK = 'PACK',
  BOX = 'BOX',
  DOZEN = 'DOZEN',
}

export enum StockTransactionType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  SALE_RETURN = 'SALE_RETURN',
  DAMAGE = 'DAMAGE',
  ADJUSTMENT = 'ADJUSTMENT',
  OPENING_STOCK = 'OPENING_STOCK',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  DIGITAL = 'DIGITAL',
}

export interface User {
  id: number;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  code?: string;
  parentId?: number | null;
  description?: string;
  isActive: boolean;
  createdAt: string;
  children?: Category[];
  parent?: Category;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  categoryId: number;
  category?: Category;
  brand?: string;
  unit: ProductUnit;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  expiryDate?: string | null;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface StockTransaction {
  id: number;
  productId: number;
  product?: Product;
  type: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  note?: string;
  notes?: string;
  createdBy?: User;
  createdAt: string;
}

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId: number;
  product?: Product;
  productName?: string;
  quantity: number;
  unitCost?: number;
  unitPurchasePrice?: number;
  subtotal: number;
}

export interface Purchase {
  id: number;
  invoiceNumber: string;
  referenceNumber?: string;
  supplierId?: number;
  supplier?: Supplier;
  purchaseDate?: string;
  totalAmount?: number;
  totalCost?: number;
  note?: string;
  notes?: string;
  createdBy?: User;
  createdAt: string;
  items?: PurchaseItem[];
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  product?: Product;
  productName?: string;
  productNameSnapshot?: string;
  skuSnapshot?: string;
  quantity: number;
  unitPrice: number;
  purchasePriceSnapshot?: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  changeAmount: number;
  createdBy?: User;
  createdAt: string;
  items?: SaleItem[];
}

export interface PosCartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DashboardSummary {
  todaysSalesTotal: number;
  todaysTransactionsCount: number;
  todaysItemsSold: number;
  todaysEstimatedProfit: number;
  lowStockProducts: Product[];
  recentSales: Sale[];
  topSellingProducts: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  last7DaysTrend: Array<{
    date: string;
    sales: number;
    count: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: any[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
