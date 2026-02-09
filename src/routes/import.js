const express = require('express');
const multer = require('multer');
const importService = require('../services/importService');
const priceService = require('../services/priceService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /import - Import dashboard
router.get('/', requireAuth, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const priceLists = await priceService.findAllLists();
    const templates = importService.getTemplates();

    res.render('import/index', {
      title: 'Importar Datos',
      priceLists,
      templates,
      result: null,
    });
  } catch (error) {
    console.error('Error loading import page:', error);
    res.status(500).send('Error al cargar página de importación');
  }
});

// POST /import/products - Import products CSV
router.post(
  '/products',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        throw new Error('No se subió ningún archivo');
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const result = await importService.importProducts(csvContent);

      const priceLists = await priceService.findAllLists();
      const templates = importService.getTemplates();

      res.render('import/index', {
        title: 'Importar Datos',
        priceLists,
        templates,
        result: {
          type: 'products',
          ...result,
        },
      });
    } catch (error) {
      console.error('Error importing products:', error);

      const priceLists = await priceService.findAllLists();
      const templates = importService.getTemplates();

      res.render('import/index', {
        title: 'Importar Datos',
        priceLists,
        templates,
        result: {
          type: 'products',
          success: 0,
          errors: [{ error: error.message }],
        },
      });
    }
  }
);

// POST /import/prices - Import prices CSV
router.post(
  '/prices',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        throw new Error('No se subió ningún archivo');
      }

      if (!req.body.priceListId) {
        throw new Error('Debe seleccionar una lista de precios');
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const result = await importService.importPrices(csvContent, req.body.priceListId);

      const priceLists = await priceService.findAllLists();
      const templates = importService.getTemplates();

      res.render('import/index', {
        title: 'Importar Datos',
        priceLists,
        templates,
        result: {
          type: 'prices',
          ...result,
        },
      });
    } catch (error) {
      console.error('Error importing prices:', error);

      const priceLists = await priceService.findAllLists();
      const templates = importService.getTemplates();

      res.render('import/index', {
        title: 'Importar Datos',
        priceLists,
        templates,
        result: {
          type: 'prices',
          success: 0,
          errors: [{ error: error.message }],
        },
      });
    }
  }
);

// POST /import/stock - Import stock CSV
router.post(
  '/stock',
  requireAuth,
  requireRole('ADMIN', 'MANAGER'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        throw new Error('No se subió ningún archivo');
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const result = await importService.importStock(csvContent, req.session.userId);

      const priceLists = await priceService.findAllLists();
      const templates = importService.getTemplates();

      res.render('import/index', {
        title: 'Importar Datos',
        priceLists,
        templates,
        result: {
          type: 'stock',
          ...result,
        },
      });
    } catch (error) {
      console.error('Error importing stock:', error);

      const priceLists = await priceService.findAllLists();
      const templates = importService.getTemplates();

      res.render('import/index', {
        title: 'Importar Datos',
        priceLists,
        templates,
        result: {
          type: 'stock',
          success: 0,
          errors: [{ error: error.message }],
        },
      });
    }
  }
);

// GET /import/template/:type - Download template
router.get('/template/:type', requireAuth, requireRole('ADMIN', 'MANAGER'), (req, res) => {
  const templates = importService.getTemplates();
  const type = req.params.type;

  if (!templates[type]) {
    return res.status(404).send('Template no encontrado');
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${type}_template.csv`);
  res.send(templates[type]);
});

module.exports = router;
