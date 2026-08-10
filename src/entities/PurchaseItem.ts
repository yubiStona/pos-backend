import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Purchase } from './Purchase.js';
import { Product } from './Product.js';

@Entity('purchase_items')
export class PurchaseItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  purchaseId!: number;

  @ManyToOne(() => Purchase, (purchase) => purchase.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseId' })
  purchase!: Purchase;

  @Column({ type: 'int' })
  productId!: number;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPurchasePrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;
}
