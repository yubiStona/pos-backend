import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Category } from './Category.js';
import { StockTransaction } from './StockTransaction.js';

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

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  sku!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  barcode!: string;

  @Column({ type: 'int' })
  categoryId!: number;

  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProductUnit.PCS,
  })
  unit!: ProductUnit;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockQuantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5 })
  lowStockThreshold!: number;

  @Column({ type: 'date', nullable: true })
  expiryDate?: Date | null;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => StockTransaction, (st) => st.product)
  stockTransactions?: StockTransaction[];
}
