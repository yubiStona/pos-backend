import { getCategoryRepository } from '../repositories/repositories.js';
import { Category } from '../entities/Category.js';
import { AppError } from '../middlewares/error.middleware.js';

export class CategoryService {
  static async getAllCategories() {
    const categoryRepo = getCategoryRepository();
    return await categoryRepo.find({
      relations: { children: true, parent: true },
      order: { name: 'ASC' },
    });
  }

  static async getCategoryById(id: number) {
    const categoryRepo = getCategoryRepository();
    const category = await categoryRepo.findOne({
      where: { id },
      relations: { children: true, parent: true, products: true },
    });
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    return category;
  }

  static async createCategory(data: {
    name: string;
    code?: string;
    parentId?: number | null;
    description?: string;
    isActive?: boolean;
  }) {
    const categoryRepo = getCategoryRepository();

    const category = categoryRepo.create({
      name: data.name,
      code: data.code || undefined,
      parentId: data.parentId ?? null,
      description: data.description || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return await categoryRepo.save(category);
  }

  static async updateCategory(
    id: number,
    data: {
      name?: string;
      code?: string;
      parentId?: number | null;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const categoryRepo = getCategoryRepository();
    const category = await categoryRepo.findOne({ where: { id } });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (data.name !== undefined) category.name = data.name;
    if (data.code !== undefined) category.code = data.code;
    if (data.parentId !== undefined) category.parentId = data.parentId;
    if (data.description !== undefined) category.description = data.description;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    return await categoryRepo.save(category);
  }

  static async deleteCategory(id: number) {
    const categoryRepo = getCategoryRepository();
    const category = await categoryRepo.findOne({
      where: { id },
      relations: { products: true },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (category.products && category.products.length > 0) {
      throw new AppError('Cannot delete category containing existing products. Deactivate it instead.', 400);
    }

    await categoryRepo.remove(category);
    return true;
  }
}
