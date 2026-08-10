import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { UserRole } from '../entities/User.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { CategorySchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJwt);

router.get('/', CategoryController.getAllCategories);
router.get('/:id', CategoryController.getCategoryById);

// Admin only mutations
router.post('/', requireRoles(UserRole.ADMIN), validateRequest(CategorySchema), CategoryController.createCategory);
router.patch('/:id', requireRoles(UserRole.ADMIN), validateRequest(CategorySchema.partial()), CategoryController.updateCategory);
router.delete('/:id', requireRoles(UserRole.ADMIN), CategoryController.deleteCategory);

export default router;
