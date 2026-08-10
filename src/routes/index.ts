import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import supplierRoutes from './supplier.routes.js';
import stockRoutes from './stock.routes.js';
import purchaseRoutes from './purchase.routes.js';
import saleRoutes from './sale.routes.js';
import reportRoutes from './report.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingRoutes from './setting.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/suppliers', supplierRoutes);
apiRouter.use('/stock', stockRoutes);
apiRouter.use('/purchases', purchaseRoutes);
apiRouter.use('/sales', saleRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/settings', settingRoutes);

export default apiRouter;
