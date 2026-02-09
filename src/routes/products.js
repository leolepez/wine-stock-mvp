const express = require('express');
const { body, validationResult } = require('express-validator');
const productService = require('../services/productService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const productValidation = [
  body('sku').trim().notEmpty().withMessage('SKU es requerido'),
  body('name').trim().notEmpty().withMessage('Nombre es requerido'),
  body('company').trim().notEmpty().withMessage('Bodega es requerida'),
  body('presentation').trim().notEmpty().withMessage('Presentación es requerida'),
  body('bottlesPerBox')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Botellas por caja debe ser un número positivo'),
];

// GET /products - List all products
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;
    const result = await productService.findAll({
      search,
      page: parseInt(page),
      limit: 20,
    });

    // If HTMX request, return only the table body
    if (req.headers['hx-request']) {
      return res.render('products/partials/table', {
        products: result.products,
        pagination: result.pagination,
        search,
      });
    }

    res.render('products/index', {
      title: 'Productos',
      products: result.products,
      pagination: result.pagination,
      search,
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).send('Error al cargar productos');
  }
});

// GET /products/new - Show create form
router.get('/new', requireAuth, requireRole('ADMIN', 'MANAGER'), (req, res) => {
  res.render('products/form', {
    title: 'Nuevo Producto',
    product: null,
    errors: [],
  });
});

// POST /products - Create product
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  productValidation,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('products/form', {
        title: 'Nuevo Producto',
        product: req.body,
        errors: errors.array(),
      });
    }

    try {
      // Check if SKU already exists
      const existing = await productService.findBySku(req.body.sku);
      if (existing) {
        return res.render('products/form', {
          title: 'Nuevo Producto',
          product: req.body,
          errors: [{ msg: 'El SKU ya existe' }],
        });
      }

      await productService.create(req.body);
      res.redirect('/products');
    } catch (error) {
      console.error('Error creating product:', error);
      res.render('products/form', {
        title: 'Nuevo Producto',
        product: req.body,
        errors: [{ msg: 'Error al crear producto' }],
      });
    }
  }
);

// GET /products/:id - Show product details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const product = await productService.findById(req.params.id);

    if (!product) {
      return res.status(404).send('Producto no encontrado');
    }

    res.render('products/show', {
      title: product.name,
      product,
    });
  } catch (error) {
    console.error('Error showing product:', error);
    res.status(500).send('Error al cargar producto');
  }
});

// GET /products/:id/edit - Show edit form
router.get('/:id/edit', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const product = await productService.findById(req.params.id);

    if (!product) {
      return res.status(404).send('Producto no encontrado');
    }

    res.render('products/form', {
      title: 'Editar Producto',
      product,
      errors: [],
    });
  } catch (error) {
    console.error('Error loading product for edit:', error);
    res.status(500).send('Error al cargar producto');
  }
});

// POST /products/:id - Update product
router.post(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  productValidation,
  async (req, res) => {
    const errors = validationResult(req);
    const productId = parseInt(req.params.id);

    if (!errors.isEmpty()) {
      return res.render('products/form', {
        title: 'Editar Producto',
        product: { id: productId, ...req.body },
        errors: errors.array(),
      });
    }

    try {
      // Check if SKU already exists for another product
      const existing = await productService.findBySku(req.body.sku);
      if (existing && existing.id !== productId) {
        return res.render('products/form', {
          title: 'Editar Producto',
          product: { id: productId, ...req.body },
          errors: [{ msg: 'El SKU ya existe en otro producto' }],
        });
      }

      await productService.update(productId, req.body);
      res.redirect('/products');
    } catch (error) {
      console.error('Error updating product:', error);
      res.render('products/form', {
        title: 'Editar Producto',
        product: { id: productId, ...req.body },
        errors: [{ msg: 'Error al actualizar producto' }],
      });
    }
  }
);

// DELETE /products/:id - Delete product
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    await productService.delete(req.params.id);

    // If HTMX request, return empty (row will be removed)
    if (req.headers['hx-request']) {
      return res.send('');
    }

    res.redirect('/products');
  } catch (error) {
    console.error('Error deleting product:', error);

    if (req.headers['hx-request']) {
      return res.status(400).send('Error al eliminar. Puede tener stock o precios asociados.');
    }

    res.status(500).send('Error al eliminar producto');
  }
});

module.exports = router;
