import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { UserRole } from '../entities/User.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { CreateUserSchema, UpdateUserSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJwt);
router.use(requireRoles(UserRole.ADMIN));

router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.post('/', validateRequest(CreateUserSchema), UserController.createUser);
router.patch('/:id', validateRequest(UpdateUserSchema), UserController.updateUser);

export default router;
