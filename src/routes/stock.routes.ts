import { Router } from 'express';
import { StockController } from '../controllers/StockController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { UserRole } from '../entities/User.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { StockAdjustmentSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJwt);

router.get('/overview', StockController.getStockOverview);
router.get('/history/:productId', StockController.getStockHistory);

// Admin only stock adjustments
router.post('/adjust', requireRoles(UserRole.ADMIN), validateRequest(StockAdjustmentSchema), StockController.adjustStock);

export default router;
