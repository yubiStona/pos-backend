import bcrypt from 'bcryptjs';
import { getUserRepository } from '../repositories/repositories.js';
import { User, UserRole } from '../entities/User.js';
import { AppError } from '../middlewares/error.middleware.js';

export class UserService {
  static async getAllUsers() {
    const userRepo = getUserRepository();
    return await userRepo.find({
      select: { id: true, name: true, username: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      order: { createdAt: 'DESC' },
    });
  }

  static async getUserById(id: number) {
    const userRepo = getUserRepository();
    const user = await userRepo.findOne({
      where: { id },
      select: { id: true, name: true, username: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  static async createUser(data: {
    name: string;
    username: string;
    email?: string;
    password: string;
    role: UserRole;
  }) {
    const userRepo = getUserRepository();

    const existing = await userRepo.findOne({ where: { username: data.username } });
    if (existing) {
      throw new AppError('Username already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = userRepo.create({
      name: data.name,
      username: data.username,
      email: data.email || undefined,
      password: hashedPassword,
      role: data.role,
      isActive: true,
    });

    await userRepo.save(newUser);

    const { password, ...result } = newUser;
    return result;
  }

  static async updateUser(
    id: number,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      isActive?: boolean;
    }
  ) {
    const userRepo = getUserRepository();
    const user = await userRepo.findOne({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (data.name) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.role) user.role = data.role;
    if (data.isActive !== undefined) user.isActive = data.isActive;

    if (data.password && data.password.trim().length > 0) {
      user.password = await bcrypt.hash(data.password, 10);
    }

    await userRepo.save(user);

    const { password, ...result } = user;
    return result;
  }
}
