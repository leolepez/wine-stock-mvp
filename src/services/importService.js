const { parse } = require('csv-parse/sync');
const prisma = require('../config/database');

const importService = {
  // Parse CSV content
  parseCSV(content, options = {}) {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      ...options,
    });
  },

  // Import products from CSV
  async importProducts(csvContent) {
    const records = this.parseCSV(csvContent);
    const results = { success: 0, errors: [], skipped: 0 };

    for (const record of records) {
      try {
        // Validate required fields
        if (!record.sku || !record.name || !record.company || !record.presentation) {
          results.errors.push({
            row: record,
            error: 'Campos requeridos faltantes (sku, name, company, presentation)',
          });
          continue;
        }

        // Check if SKU exists
        const existing = await prisma.product.findUnique({
          where: { sku: record.sku },
        });

        if (existing) {
          // Update existing
          await prisma.product.update({
            where: { sku: record.sku },
            data: {
              name: record.name,
              company: record.company,
              presentation: record.presentation,
              vintage: record.vintage || null,
              varietal: record.varietal || null,
              imageUrl: record.imageUrl || null,
              bottlesPerBox: parseInt(record.bottlesPerBox) || 6,
            },
          });
          results.success++;
        } else {
          // Create new
          await prisma.product.create({
            data: {
              sku: record.sku,
              name: record.name,
              company: record.company,
              presentation: record.presentation,
              vintage: record.vintage || null,
              varietal: record.varietal || null,
              imageUrl: record.imageUrl || null,
              bottlesPerBox: parseInt(record.bottlesPerBox) || 6,
            },
          });
          results.success++;
        }
      } catch (error) {
        results.errors.push({
          row: record,
          error: error.message,
        });
      }
    }

    return results;
  },

  // Import prices from CSV
  async importPrices(csvContent, priceListId) {
    const records = this.parseCSV(csvContent);
    const results = { success: 0, errors: [], skipped: 0 };

    for (const record of records) {
      try {
        // Validate required fields
        if (!record.sku || !record.basePrice) {
          results.errors.push({
            row: record,
            error: 'Campos requeridos faltantes (sku, basePrice)',
          });
          continue;
        }

        // Find product by SKU
        const product = await prisma.product.findUnique({
          where: { sku: record.sku },
        });

        if (!product) {
          results.errors.push({
            row: record,
            error: `Producto no encontrado: ${record.sku}`,
          });
          continue;
        }

        // Upsert price
        await prisma.price.upsert({
          where: {
            priceListId_productId: {
              priceListId: parseInt(priceListId),
              productId: product.id,
            },
          },
          update: {
            basePrice: parseFloat(record.basePrice),
            ivaPercent: parseFloat(record.ivaPercent) || 21,
            currency: record.currency || 'ARS',
          },
          create: {
            priceListId: parseInt(priceListId),
            productId: product.id,
            basePrice: parseFloat(record.basePrice),
            ivaPercent: parseFloat(record.ivaPercent) || 21,
            currency: record.currency || 'ARS',
          },
        });

        results.success++;
      } catch (error) {
        results.errors.push({
          row: record,
          error: error.message,
        });
      }
    }

    return results;
  },

  // Import stock from CSV
  async importStock(csvContent, userId) {
    const records = this.parseCSV(csvContent);
    const results = { success: 0, errors: [], skipped: 0 };

    for (const record of records) {
      try {
        // Validate required fields
        if (!record.sku || !record.warehouseCode || !record.quantity) {
          results.errors.push({
            row: record,
            error: 'Campos requeridos faltantes (sku, warehouseCode, quantity)',
          });
          continue;
        }

        // Find product by SKU
        const product = await prisma.product.findUnique({
          where: { sku: record.sku },
        });

        if (!product) {
          results.errors.push({
            row: record,
            error: `Producto no encontrado: ${record.sku}`,
          });
          continue;
        }

        // Find warehouse by code
        const warehouse = await prisma.warehouse.findUnique({
          where: { code: record.warehouseCode },
        });

        if (!warehouse) {
          results.errors.push({
            row: record,
            error: `Depósito no encontrado: ${record.warehouseCode}`,
          });
          continue;
        }

        const quantity = parseInt(record.quantity);

        // Get current stock
        const currentStock = await prisma.stockLevel.findUnique({
          where: {
            warehouseId_productId_unit: {
              warehouseId: warehouse.id,
              productId: product.id,
              unit: 'BOTTLE',
            },
          },
        });

        const currentQty = currentStock?.quantity || 0;
        const delta = quantity - currentQty;

        if (delta !== 0) {
          // Update stock and create movement
          await prisma.$transaction([
            prisma.stockLevel.upsert({
              where: {
                warehouseId_productId_unit: {
                  warehouseId: warehouse.id,
                  productId: product.id,
                  unit: 'BOTTLE',
                },
              },
              update: { quantity },
              create: {
                warehouseId: warehouse.id,
                productId: product.id,
                quantity,
                unit: 'BOTTLE',
              },
            }),
            prisma.movement.create({
              data: {
                productId: product.id,
                warehouseId: warehouse.id,
                userId: parseInt(userId),
                delta,
                unit: 'BOTTLE',
                reason: 'Importación CSV',
              },
            }),
          ]);
        }

        results.success++;
      } catch (error) {
        results.errors.push({
          row: record,
          error: error.message,
        });
      }
    }

    return results;
  },

  // Get sample CSV templates
  getTemplates() {
    return {
      products: `sku,name,company,presentation,vintage,varietal,bottlesPerBox
MAL001,Malbec Reserva,Bodega Norton,750ml,2020,Malbec,6
CAB002,Cabernet Sauvignon,Catena Zapata,750ml,2019,Cabernet Sauvignon,6`,

      prices: `sku,basePrice,ivaPercent,currency
MAL001,4500,21,ARS
CAB002,7800,21,ARS`,

      stock: `sku,warehouseCode,quantity
MAL001,DC01,100
MAL001,DS01,50
CAB002,DC01,75`,
    };
  },
};

module.exports = importService;
