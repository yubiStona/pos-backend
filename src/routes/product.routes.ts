import { Router } from 'express';
import { ProductController } from '../controllers/ProductController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { UserRole } from '../entities/User.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { ProductSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJwt);

router.get('/', ProductController.getProducts);
router.get('/barcode/:barcode', ProductController.getProductByBarcode);
router.get('/:id', ProductController.getProductById);

// Admin only mutations
router.post('/', requireRoles(UserRole.ADMIN), validateRequest(ProductSchema), ProductController.createProduct);
router.patch('/:id', requireRoles(UserRole.ADMIN), validateRequest(ProductSchema.partial()), ProductController.updateProduct);
router.delete('/:id', requireRoles(UserRole.ADMIN), ProductController.deactivateProduct);

export default router;
