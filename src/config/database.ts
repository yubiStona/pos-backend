import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ENV } from './env.js';
import { User } from '../entities/User.js';
import { Category } from '../entities/Category.js';
import { Supplier } from '../entities/Supplier.js';
import { Product } from '../entities/Product.js';
import { StockTransaction } from '../entities/StockTransaction.js';
import { Purchase } from '../entities/Purchase.js';
import { PurchaseItem } from '../entities/PurchaseItem.js';
import { Sale } from '../entities/Sale.js';
import { SaleItem } from '../entities/SaleItem.js';
import { Setting } from '../entities/Setting.js';

export const AppDataSource = new DataSource(
  ENV.DB_TYPE === 'mysql'
    ? {
        type: 'mysql' as const,
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        username: ENV.DB_USERNAME,
        password: ENV.DB_PASSWORD,
        database: ENV.DB_NAME,
        synchronize: false,
        logging: ENV.NODE_ENV === 'development',
        entities: [
          User,
          Category,
          Supplier,
          Product,
          StockTransaction,
          Purchase,
          PurchaseItem,
          Sale,
          SaleItem,
          Setting,
        ],
        migrations: ['src/migrations/*.ts'],
        subscribers: [],
      }
    : {
        type: 'sqljs' as const,
        location: ENV.DB_DATABASE,
        autoSave: true,
        synchronize: true, // Auto sync schema for local mode
        logging: false,
        entities: [
          User,
          Category,
          Supplier,
          Product,
          StockTransaction,
          Purchase,
          PurchaseItem,
          Sale,
          SaleItem,
          Setting,
        ],
        migrations: ['src/migrations/*.ts'],
        subscribers: [],
      }
);

export async function initializeDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log(`Database initialized successfully (${ENV.DB_TYPE})`);
  }
  return AppDataSource;
}
