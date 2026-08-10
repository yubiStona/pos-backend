import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Sale } from './Sale.js';
import { Purchase } from './Purchase.js';
import { StockTransaction } from './StockTransaction.js';

export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.CASHIER,
  })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Sale, (sale) => sale.createdBy)
  sales?: Sale[];

  @OneToMany(() => Purchase, (purchase) => purchase.createdBy)
  purchases?: Purchase[];

  @OneToMany(() => StockTransaction, (st) => st.createdBy)
  stockTransactions?: StockTransaction[];
}
