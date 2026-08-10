import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserRepository } from '../repositories/repositories.js';
import { User, UserRole } from '../entities/User.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ENV } from '../config/env.js';

export class AuthService {
  static async login(username: string, password: string) {
    const userRepo = getUserRepository();
    const user = await userRepo.findOne({ where: { username } });

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact admin.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid username or password', 401);
    }

    const payload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  static async me(userId: number) {
    const userRepo = getUserRepository();
    const user = await userRepo.findOne({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true, role: true, isActive: true, createdAt: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}
