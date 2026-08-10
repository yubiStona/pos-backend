import { z } from 'zod';
import { UserRole } from '../entities/User.js';
import { ProductUnit } from '../entities/Product.js';
import { StockTransactionType } from '../entities/StockTransaction.js';
import { PaymentMethod } from '../entities/Sale.js';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  code: z.string().optional(),
  parentId: z.number().nullable().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const SupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const ProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  categoryId: z.number({ message: 'Category is required' }),
  brand: z.string().optional(),
  unit: z.nativeEnum(ProductUnit).default(ProductUnit.PCS),
  purchasePrice: z.number().min(0, 'Purchase price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  stockQuantity: z.number().min(0, 'Stock quantity cannot be negative').default(0),
  lowStockThreshold: z.number().min(0).default(5),
  expiryDate: z.string().nullable().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const StockAdjustmentSchema = z.object({
  productId: z.number(),
  type: z.nativeEnum(StockTransactionType),
  quantity: z.number(),
  note: z.string().optional(),
});

export const PurchaseItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPurchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
});

export const CreatePurchaseSchema = z.object({
  supplierId: z.number(),
  invoiceNumber: z.string().min(1, 'Invoice/Ref number is required'),
  purchaseDate: z.string().optional(),
  note: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, 'At least one item is required'),
});

export const SaleItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().positive('Quantity must be greater than 0'),
});

export const CreateSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1, 'At least one item is required in bill'),
  discount: z.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  cashReceived: z.number().min(0).default(0),
});

export const SettingsSchema = z.record(z.string(), z.string());
