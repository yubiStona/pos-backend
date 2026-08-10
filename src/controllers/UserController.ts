import { Response, NextFunction } from 'express';
import { UserService } from '../services/UserService.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class UserController {
  static async getAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await UserService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = await UserService.getUserById(id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser(req.body);
      res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = await UserService.updateUser(id, req.body);
      res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (error) {
      next(error);
    }
  }
}
