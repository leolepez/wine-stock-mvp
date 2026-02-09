const express = require('express');
const { body, validationResult } = require('express-validator');
const priceService = require('../services/priceService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const priceListValidation = [
  body('name').trim().notEmpty().withMessage('Nombre es requerido'),
];

const priceValidation = [
  body('basePrice')
    .isFloat({ min: 0 })
    .withMessage('Precio base debe ser un número positivo'),
  body('ivaPercent')
    .isFloat({ min: 0, max: 100 })
    .withMessage('IVA debe ser entre 0 y 100'),
];

// GET /prices - List all price lists
router.get('/', requireAuth, async (req, res) => {
  try {
    const priceLists = await priceService.findAllLists();

    res.render('prices/index', {
      title: 'Listas de Precios',
      priceLists,
    });
  } catch (error) {
    console.error('Error listing price lists:', error);
    res.status(500).send('Error al cargar listas de precios');
  }
});

// GET /prices/new - Show create list form
router.get('/new', requireAuth, requireRole('ADMIN', 'MANAGER'), (req, res) => {
  res.render('prices/list-form', {
    title: 'Nueva Lista de Precios',
    priceList: null,
    errors: [],
  });
});

// POST /prices - Create price list
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  priceListValidation,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('prices/list-form', {
        title: 'Nueva Lista de Precios',
        priceList: req.body,
        errors: errors.array(),
      });
    }

    try {
      await priceService.createList(req.body);
      res.redirect('/prices');
    } catch (error) {
      console.error('Error creating price list:', error);
      res.render('prices/list-form', {
        title: 'Nueva Lista de Precios',
        priceList: req.body,
        errors: [{ msg: 'Error al crear lista de precios' }],
      });
    }
  }
);

// GET /prices/:id - Show price list with all prices
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const priceList = await priceService.findListById(req.params.id);

    if (!priceList) {
      return res.status(404).send('Lista de precios no encontrada');
    }

    const productsWithPrices = await priceService.getProductsWithPrices(req.params.id);

    res.render('prices/show', {
      title: priceList.name,
      priceList,
      productsWithPrices,
    });
  } catch (error) {
    console.error('Error showing price list:', error);
    res.status(500).send('Error al cargar lista de precios');
  }
});

// GET /prices/:id/edit - Show edit list form
router.get('/:id/edit', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const priceList = await priceService.findListById(req.params.id);

    if (!priceList) {
      return res.status(404).send('Lista de precios no encontrada');
    }

    res.render('prices/list-form', {
      title: 'Editar Lista de Precios',
      priceList,
      errors: [],
    });
  } catch (error) {
    console.error('Error loading price list for edit:', error);
    res.status(500).send('Error al cargar lista de precios');
  }
});

// POST /prices/:id - Update price list
router.post(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  priceListValidation,
  async (req, res) => {
    const errors = validationResult(req);
    const priceListId = parseInt(req.params.id);

    if (!errors.isEmpty()) {
      return res.render('prices/list-form', {
        title: 'Editar Lista de Precios',
        priceList: { id: priceListId, ...req.body },
        errors: errors.array(),
      });
    }

    try {
      await priceService.updateList(priceListId, req.body);
      res.redirect('/prices');
    } catch (error) {
      console.error('Error updating price list:', error);
      res.render('prices/list-form', {
        title: 'Editar Lista de Precios',
        priceList: { id: priceListId, ...req.body },
        errors: [{ msg: 'Error al actualizar lista de precios' }],
      });
    }
  }
);

// DELETE /prices/:id - Delete price list
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    await priceService.deleteList(req.params.id);

    if (req.headers['hx-request']) {
      return res.send('');
    }

    res.redirect('/prices');
  } catch (error) {
    console.error('Error deleting price list:', error);

    if (req.headers['hx-request']) {
      return res.status(400).send('Error al eliminar. Puede tener precios asociados.');
    }

    res.status(500).send('Error al eliminar lista de precios');
  }
});

// POST /prices/:id/prices - Update single price (HTMX)
router.post(
  '/:id/prices/:productId',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  priceValidation,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).send(errors.array()[0].msg);
    }

    try {
      const price = await priceService.upsertPrice(
        req.params.id,
        req.params.productId,
        req.body
      );

      const finalPrice = parseFloat(price.basePrice) * (1 + parseFloat(price.ivaPercent) / 100);

      // Return updated row for HTMX
      res.send(`
        <td class="px-4 py-3 text-sm text-gray-900">${price.currency} ${parseFloat(price.basePrice).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td class="px-4 py-3 text-sm text-gray-500">${price.ivaPercent}%</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${price.currency} ${finalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        <td class="px-4 py-3 text-sm text-green-600">✓ Guardado</td>
      `);
    } catch (error) {
      console.error('Error updating price:', error);
      res.status(500).send('Error al actualizar precio');
    }
  }
);

// DELETE /prices/:id/prices/:productId - Delete single price
router.delete(
  '/:id/prices/:productId',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      await priceService.deletePrice(req.params.id, req.params.productId);

      if (req.headers['hx-request']) {
        return res.send('<td colspan="4" class="px-4 py-3 text-sm text-gray-400 italic">Sin precio</td>');
      }

      res.redirect(`/prices/${req.params.id}`);
    } catch (error) {
      console.error('Error deleting price:', error);
      res.status(500).send('Error al eliminar precio');
    }
  }
);

module.exports = router;
