import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateJwt);

router.get('/summary', DashboardController.getSummary);

export default router;
