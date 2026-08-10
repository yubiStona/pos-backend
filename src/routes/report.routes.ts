import { Router } from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { UserRole } from '../entities/User.js';

const router = Router();

router.use(authenticateJwt);
router.use(requireRoles(UserRole.ADMIN));

router.get('/sales', ReportController.getSalesReport);
router.get('/products', ReportController.getProductSalesReport);
router.get('/categories', ReportController.getCategorySalesReport);
router.get('/stock', ReportController.getStockReport);
router.get('/purchases', ReportController.getPurchaseReport);

export default router;
