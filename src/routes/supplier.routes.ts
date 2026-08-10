import { Router } from 'express';
import { SupplierController } from '../controllers/SupplierController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { UserRole } from '../entities/User.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { SupplierSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJwt);

router.get('/', SupplierController.getAllSuppliers);
router.get('/:id', SupplierController.getSupplierById);

// Admin only mutations
router.post('/', requireRoles(UserRole.ADMIN), validateRequest(SupplierSchema), SupplierController.createSupplier);
router.patch('/:id', requireRoles(UserRole.ADMIN), validateRequest(SupplierSchema.partial()), SupplierController.updateSupplier);

export default router;
