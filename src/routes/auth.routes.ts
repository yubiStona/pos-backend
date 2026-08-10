import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { LoginSchema } from '../validators/schemas.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', validateRequest(LoginSchema), AuthController.login);
router.get('/me', authenticateJwt, AuthController.me);

export default router;
