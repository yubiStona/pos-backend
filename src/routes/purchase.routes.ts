import { Router } from 'express';
import { PurchaseController } from '../controllers/PurchaseController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { UserRole } from '../entities/User.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { CreatePurchaseSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJwt);

// Admin only purchase / stock-in
router.post('/', requireRoles(UserRole.ADMIN), validateRequest(CreatePurchaseSchema), PurchaseController.createPurchase);
router.get('/', requireRoles(UserRole.ADMIN), PurchaseController.getPurchases);
router.get('/:id', requireRoles(UserRole.ADMIN), PurchaseController.getPurchaseById);

export default router;
