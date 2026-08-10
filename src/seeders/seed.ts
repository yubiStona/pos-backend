import bcrypt from 'bcryptjs';
import { AppDataSource, initializeDatabase } from '../config/database.js';
import { User, UserRole } from '../entities/User.js';
import { Category } from '../entities/Category.js';
import { Supplier } from '../entities/Supplier.js';
import { Product, ProductUnit } from '../entities/Product.js';
import { StockTransaction, StockTransactionType } from '../entities/StockTransaction.js';
import { Purchase } from '../entities/Purchase.js';
import { PurchaseItem } from '../entities/PurchaseItem.js';
import { Sale, PaymentMethod } from '../entities/Sale.js';
import { SaleItem } from '../entities/SaleItem.js';
import { Setting } from '../entities/Setting.js';

export async function seedDatabase() {
  await initializeDatabase();
  console.log('Seeding small-mart database...');

  const userRepo = AppDataSource.getRepository(User);
  const categoryRepo = AppDataSource.getRepository(Category);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const productRepo = AppDataSource.getRepository(Product);
  const stockRepo = AppDataSource.getRepository(StockTransaction);
  const purchaseRepo = AppDataSource.getRepository(Purchase);
  const purchaseItemRepo = AppDataSource.getRepository(PurchaseItem);
  const saleRepo = AppDataSource.getRepository(Sale);
  const saleItemRepo = AppDataSource.getRepository(SaleItem);
  const settingRepo = AppDataSource.getRepository(Setting);

  // 1. Seed Users if none exist
  const existingUsersCount = await userRepo.count();
  let adminUser: User;
  let cashierUser: User;

  if (existingUsersCount === 0) {
    const adminPass = await bcrypt.hash('admin123', 10);
    adminUser = userRepo.create({
      name: 'System Admin',
      username: 'admin',
      email: 'admin@smallmart.com',
      password: adminPass,
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepo.save(adminUser);

    const cashierPass = await bcrypt.hash('cashier123', 10);
    cashierUser = userRepo.create({
      name: 'Rohan Sharma (Cashier)',
      username: 'cashier',
      email: 'rohan@smallmart.com',
      password: cashierPass,
      role: UserRole.CASHIER,
      isActive: true,
    });
    await userRepo.save(cashierUser);
    console.log('Created default users: admin/admin123, cashier/cashier123');
  } else {
    adminUser = (await userRepo.findOne({ where: { username: 'admin' } }))!;
    cashierUser = (await userRepo.findOne({ where: { username: 'cashier' } })) || adminUser;
  }

  // 2. Seed Categories
  const existingCatCount = await categoryRepo.count();
  if (existingCatCount === 0) {
    const grocery = await categoryRepo.save(
      categoryRepo.create({ name: 'Grocery', code: 'GROC', description: 'Essential staple food items' })
    );

    await categoryRepo.save(categoryRepo.create({ name: 'Rice & Grains', code: 'RICE', parentId: grocery.id }));
    await categoryRepo.save(categoryRepo.create({ name: 'Pulses & Lentils', code: 'PULS', parentId: grocery.id }));
    await categoryRepo.save(categoryRepo.create({ name: 'Edible Oil & Ghee', code: 'OILS', parentId: grocery.id }));

    const beverages = await categoryRepo.save(
      categoryRepo.create({ name: 'Beverages', code: 'BEV', description: 'Cold drinks, juices and bottled water' })
    );
    await categoryRepo.save(categoryRepo.create({ name: 'Soft Drinks', code: 'SDFT', parentId: beverages.id }));
    await categoryRepo.save(categoryRepo.create({ name: 'Juices & Teas', code: 'JUIC', parentId: beverages.id }));

    const snacks = await categoryRepo.save(
      categoryRepo.create({ name: 'Snacks & Confectionery', code: 'SNK', description: 'Chips, biscuits and chocolates' })
    );

    const dairy = await categoryRepo.save(
      categoryRepo.create({ name: 'Dairy & Bakery', code: 'DRY', description: 'Fresh milk, cheese, butter & bread' })
    );

    const household = await categoryRepo.save(
      categoryRepo.create({ name: 'Household & Cleaning', code: 'HSH', description: 'Detergents, soaps and cleaners' })
    );

    console.log('Created standard categories');
  }

  // 3. Seed Suppliers
  const supplierCount = await supplierRepo.count();
  let sup1: Supplier;
  let sup2: Supplier;

  if (supplierCount === 0) {
    sup1 = await supplierRepo.save(
      supplierRepo.create({
        name: 'Himalayan Food Distributors',
        phone: '9841234567',
        email: 'supply@himalayanfoods.com',
        address: 'Balaju Industrial Zone, Kathmandu',
        notes: 'Main distributor for rice, oil and pulses',
      })
    );

    sup2 = await supplierRepo.save(
      supplierRepo.create({
        name: 'Bottlers Nepal Ltd',
        phone: '9801122334',
        email: 'orders@bottlersnepal.com',
        address: 'Balaju, Kathmandu',
        notes: 'Beverage & Soft Drinks supplier',
      })
    );

    await supplierRepo.save(
      supplierRepo.create({
        name: 'Apex FMCG Suppliers',
        phone: '9851098765',
        email: 'apex.fmcg@gmail.com',
        address: 'New Road, Kathmandu',
        notes: 'Biscuits, snacks and personal care products',
      })
    );
    console.log('Created default suppliers');
  } else {
    sup1 = (await supplierRepo.findOne({ where: {} }))!;
    sup2 = sup1;
  }

  // 4. Seed Products
  const productCount = await productRepo.count();
  if (productCount === 0) {
    const categories = await categoryRepo.find();
    const groceryCat = categories.find((c) => c.code === 'GROC' || c.code === 'RICE') || categories[0];
    const bevCat = categories.find((c) => c.code === 'BEV' || c.code === 'SDFT') || categories[0];
    const snackCat = categories.find((c) => c.code === 'SNK') || categories[0];
    const dairyCat = categories.find((c) => c.code === 'DRY') || categories[0];
    const houseCat = categories.find((c) => c.code === 'HSH') || categories[0];

    const sampleProducts = [
      {
        name: 'Jeera Masino Premium Rice 25kg',
        sku: 'RICE-25KG-01',
        barcode: '8901234500012',
        categoryId: groceryCat.id,
        brand: 'Himalayan',
        unit: ProductUnit.PACK,
        purchasePrice: 1850.0,
        sellingPrice: 2150.0,
        stockQuantity: 45,
        lowStockThreshold: 10,
      },
      {
        name: 'Coca Cola 500ml Bottle',
        sku: 'COKE-500ML',
        barcode: '8901234500029',
        categoryId: bevCat.id,
        brand: 'Coca Cola',
        unit: ProductUnit.PCS,
        purchasePrice: 55.0,
        sellingPrice: 70.0,
        stockQuantity: 120,
        lowStockThreshold: 20,
      },
      {
        name: 'Sprite 2.25L Bottle',
        sku: 'SPRITE-225L',
        barcode: '8901234500036',
        categoryId: bevCat.id,
        brand: 'Sprite',
        unit: ProductUnit.PCS,
        purchasePrice: 190.0,
        sellingPrice: 230.0,
        stockQuantity: 30,
        lowStockThreshold: 8,
      },
      {
        name: 'Lays Classic Salted Chips 50g',
        sku: 'LAYS-SLT-50G',
        barcode: '8901234500043',
        categoryId: snackCat.id,
        brand: 'Lays',
        unit: ProductUnit.PCS,
        purchasePrice: 40.0,
        sellingPrice: 50.0,
        stockQuantity: 85,
        lowStockThreshold: 15,
      },
      {
        name: 'Good Day Butter Biscuits 100g',
        sku: 'GOODDAY-100G',
        barcode: '8901234500050',
        categoryId: snackCat.id,
        brand: 'Britannia',
        unit: ProductUnit.PCS,
        purchasePrice: 35.0,
        sellingPrice: 45.0,
        stockQuantity: 3, // Low stock on purpose
        lowStockThreshold: 10,
      },
      {
        name: 'Amul Butter 100g Pack',
        sku: 'AMUL-BTR-100G',
        barcode: '8901234500067',
        categoryId: dairyCat.id,
        brand: 'Amul',
        unit: ProductUnit.PACK,
        purchasePrice: 110.0,
        sellingPrice: 135.0,
        stockQuantity: 0, // Out of stock on purpose
        lowStockThreshold: 5,
      },
      {
        name: 'Sunflower Cooking Oil 1L Pouch',
        sku: 'OIL-SUN-1L',
        barcode: '8901234500074',
        categoryId: groceryCat.id,
        brand: 'Fortune',
        unit: ProductUnit.LITER,
        purchasePrice: 210.0,
        sellingPrice: 250.0,
        stockQuantity: 60,
        lowStockThreshold: 12,
      },
      {
        name: 'Vim Dishwash Bar 200g',
        sku: 'VIM-BAR-200G',
        barcode: '8901234500081',
        categoryId: houseCat.id,
        brand: 'Vim',
        unit: ProductUnit.PCS,
        purchasePrice: 28.0,
        sellingPrice: 35.0,
        stockQuantity: 4, // Low stock
        lowStockThreshold: 10,
      },
    ];

    for (const prodData of sampleProducts) {
      const p = productRepo.create(prodData);
      const savedProduct = await productRepo.save(p);

      if (savedProduct.stockQuantity > 0) {
        await stockRepo.save(
          stockRepo.create({
            productId: savedProduct.id,
            type: StockTransactionType.OPENING_STOCK,
            quantity: savedProduct.stockQuantity,
            previousStock: 0,
            newStock: savedProduct.stockQuantity,
            note: 'Initial Opening Stock',
            createdById: adminUser.id,
          })
        );
      }
    }
    console.log('Created sample products and stock logs');
  }

  // 5. Seed initial store settings if not set
  const settingsCount = await settingRepo.count();
  if (settingsCount === 0) {
    const defaults = [
      { key: 'storeName', value: 'Small-Mart Retail Supermarket' },
      { key: 'address', value: 'New Baneshwor Chowk, Kathmandu, Nepal' },
      { key: 'phone', value: '+977-1-4780123 / +977-9851020304' },
      { key: 'email', value: 'billing@smallmart.com.np' },
      { key: 'currency', value: 'NPR' },
      { key: 'currencySymbol', value: 'Rs. ' },
      { key: 'vatPercentage', value: '0' },
      { key: 'invoiceFooter', value: 'Thank you for shopping at Small-Mart! Please keep this receipt for return/exchange within 7 days.' },
      { key: 'receiptWidth', value: '80mm' },
    ];

    for (const def of defaults) {
      await settingRepo.save(settingRepo.create(def));
    }
    console.log('Created store settings');
  }

  console.log('Seeding completed successfully!');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
