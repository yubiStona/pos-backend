import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product.js';
import { User } from './User.js';

export enum StockTransactionType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  SALE_RETURN = 'SALE_RETURN',
  DAMAGE = 'DAMAGE',
  ADJUSTMENT = 'ADJUSTMENT',
  OPENING_STOCK = 'OPENING_STOCK',
}

@Entity('stock_transactions')
export class StockTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  productId!: number;

  @ManyToOne(() => Product, (product) => product.stockTransactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({
    type: 'varchar',
    length: 30,
  })
  type!: StockTransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  previousStock!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  newStock!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'int', nullable: true })
  createdById?: number;

  @ManyToOne(() => User, (user) => user.stockTransactions, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @CreateDateColumn()
  createdAt!: Date;
}
