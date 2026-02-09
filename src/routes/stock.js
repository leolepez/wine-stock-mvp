const express = require('express');
const { body, validationResult } = require('express-validator');
const stockService = require('../services/stockService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const adjustmentValidation = [
  body('warehouseId').isInt().withMessage('Depósito es requerido'),
  body('productId').isInt().withMessage('Producto es requerido'),
  body('delta').isInt().withMessage('Cantidad debe ser un número entero'),
  body('reason').trim().notEmpty().withMessage('Motivo es requerido'),
];

const transferValidation = [
  body('fromWarehouseId').isInt().withMessage('Depósito origen es requerido'),
  body('toWarehouseId').isInt().withMessage('Depósito destino es requerido'),
  body('productId').isInt().withMessage('Producto es requerido'),
  body('quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser positiva'),
];

// GET /stock - Stock overview
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search = '', warehouse = '' } = req.query;
    const warehouses = await stockService.getWarehouses();
    const stockLevels = await stockService.getStockOverview({
      search,
      warehouseId: warehouse || null,
    });

    // Group by product
    const productStock = {};
    stockLevels.forEach((sl) => {
      if (!productStock[sl.productId]) {
        productStock[sl.productId] = {
          product: sl.product,
          warehouses: {},
          total: 0,
        };
      }
      productStock[sl.productId].warehouses[sl.warehouseId] = sl.quantity;
      productStock[sl.productId].total += sl.quantity;
    });

    res.render('stock/index', {
      title: 'Inventario',
      warehouses,
      productStock: Object.values(productStock),
      search,
      selectedWarehouse: warehouse,
    });
  } catch (error) {
    console.error('Error loading stock:', error);
    res.status(500).send('Error al cargar inventario');
  }
});

// GET /stock/movements - Movement history
router.get('/movements', requireAuth, async (req, res) => {
  try {
    const { warehouse = '' } = req.query;
    const warehouses = await stockService.getWarehouses();
    const movements = await stockService.getMovements({
      warehouseId: warehouse || null,
      limit: 100,
    });

    res.render('stock/movements', {
      title: 'Movimientos',
      warehouses,
      movements,
      selectedWarehouse: warehouse,
    });
  } catch (error) {
    console.error('Error loading movements:', error);
    res.status(500).send('Error al cargar movimientos');
  }
});

// GET /stock/adjust - Adjustment form
router.get('/adjust', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const warehouses = await stockService.getWarehouses();
    const products = await require('../config/database').product.findMany({
      orderBy: { name: 'asc' },
    });

    res.render('stock/adjust', {
      title: 'Ajuste de Stock',
      warehouses,
      products,
      errors: [],
      formData: {},
    });
  } catch (error) {
    console.error('Error loading adjust form:', error);
    res.status(500).send('Error al cargar formulario');
  }
});

// POST /stock/adjust - Process adjustment
router.post(
  '/adjust',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  adjustmentValidation,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const warehouses = await stockService.getWarehouses();
      const products = await require('../config/database').product.findMany({
        orderBy: { name: 'asc' },
      });

      return res.render('stock/adjust', {
        title: 'Ajuste de Stock',
        warehouses,
        products,
        errors: errors.array(),
        formData: req.body,
      });
    }

    try {
      await stockService.adjustStock({
        ...req.body,
        userId: req.session.userId,
      });

      if (req.headers['hx-request']) {
        res.set('HX-Redirect', '/stock');
        return res.send('');
      }

      res.redirect('/stock');
    } catch (error) {
      console.error('Error adjusting stock:', error);

      const warehouses = await stockService.getWarehouses();
      const products = await require('../config/database').product.findMany({
        orderBy: { name: 'asc' },
      });

      res.render('stock/adjust', {
        title: 'Ajuste de Stock',
        warehouses,
        products,
        errors: [{ msg: error.message || 'Error al ajustar stock' }],
        formData: req.body,
      });
    }
  }
);

// GET /stock/transfer - Transfer form
router.get('/transfer', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const warehouses = await stockService.getWarehouses();
    const products = await require('../config/database').product.findMany({
      orderBy: { name: 'asc' },
    });

    res.render('stock/transfer', {
      title: 'Transferencia de Stock',
      warehouses,
      products,
      errors: [],
      formData: {},
    });
  } catch (error) {
    console.error('Error loading transfer form:', error);
    res.status(500).send('Error al cargar formulario');
  }
});

// POST /stock/transfer - Process transfer
router.post(
  '/transfer',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  transferValidation,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const warehouses = await stockService.getWarehouses();
      const products = await require('../config/database').product.findMany({
        orderBy: { name: 'asc' },
      });

      return res.render('stock/transfer', {
        title: 'Transferencia de Stock',
        warehouses,
        products,
        errors: errors.array(),
        formData: req.body,
      });
    }

    if (req.body.fromWarehouseId === req.body.toWarehouseId) {
      const warehouses = await stockService.getWarehouses();
      const products = await require('../config/database').product.findMany({
        orderBy: { name: 'asc' },
      });

      return res.render('stock/transfer', {
        title: 'Transferencia de Stock',
        warehouses,
        products,
        errors: [{ msg: 'Los depósitos deben ser diferentes' }],
        formData: req.body,
      });
    }

    try {
      await stockService.transferStock({
        ...req.body,
        userId: req.session.userId,
      });

      res.redirect('/stock');
    } catch (error) {
      console.error('Error transferring stock:', error);

      const warehouses = await stockService.getWarehouses();
      const products = await require('../config/database').product.findMany({
        orderBy: { name: 'asc' },
      });

      res.render('stock/transfer', {
        title: 'Transferencia de Stock',
        warehouses,
        products,
        errors: [{ msg: error.message || 'Error al transferir stock' }],
        formData: req.body,
      });
    }
  }
);

// GET /stock/alerts - Low stock alerts
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const alerts = await stockService.getLowStockAlerts(20);

    res.render('stock/alerts', {
      title: 'Alertas de Stock',
      alerts,
    });
  } catch (error) {
    console.error('Error loading alerts:', error);
    res.status(500).send('Error al cargar alertas');
  }
});

module.exports = router;
