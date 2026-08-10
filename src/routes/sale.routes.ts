import { Router } from 'express';
import { SaleController } from '../controllers/SaleController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { CreateSaleSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJwt);

router.post('/', validateRequest(CreateSaleSchema), SaleController.createSale);
router.get('/', SaleController.getSales);
router.get('/:id', SaleController.getSaleById);

export default router;
