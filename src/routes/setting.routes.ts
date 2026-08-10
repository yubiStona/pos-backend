import { Router } from 'express';
import { SettingController } from '../controllers/SettingController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { UserRole } from '../entities/User.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { SettingsSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJwt);

router.get('/', SettingController.getSettings);
router.post('/', requireRoles(UserRole.ADMIN), validateRequest(SettingsSchema), SettingController.updateSettings);

export default router;
