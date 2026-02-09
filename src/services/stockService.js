const prisma = require('../config/database');

const stockService = {
  // Get all warehouses
  async getWarehouses() {
    return prisma.warehouse.findMany({
      orderBy: { name: 'asc' },
    });
  },

  // Get stock overview (all products across all warehouses)
  async getStockOverview({ search = '', warehouseId = null } = {}) {
    const where = {};

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { company: { contains: search } },
        ],
      };
    }

    if (warehouseId) {
      where.warehouseId = parseInt(warehouseId);
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: [
        { product: { name: 'asc' } },
        { warehouse: { name: 'asc' } },
      ],
    });

    return stockLevels;
  },

  // Get stock for a specific product
  async getProductStock(productId) {
    return prisma.stockLevel.findMany({
      where: { productId: parseInt(productId) },
      include: { warehouse: true },
    });
  },

  // Get stock level for specific product and warehouse
  async getStockLevel(warehouseId, productId) {
    return prisma.stockLevel.findUnique({
      where: {
        warehouseId_productId_unit: {
          warehouseId: parseInt(warehouseId),
          productId: parseInt(productId),
          unit: 'BOTTLE',
        },
      },
      include: { product: true, warehouse: true },
    });
  },

  // Adjust stock (add/remove) with movement record
  async adjustStock({ warehouseId, productId, delta, unit, reason, userId }) {
    return prisma.$transaction(async (tx) => {
      // Upsert stock level
      const stockLevel = await tx.stockLevel.upsert({
        where: {
          warehouseId_productId_unit: {
            warehouseId: parseInt(warehouseId),
            productId: parseInt(productId),
            unit: unit || 'BOTTLE',
          },
        },
        update: {
          quantity: { increment: parseInt(delta) },
        },
        create: {
          warehouseId: parseInt(warehouseId),
          productId: parseInt(productId),
          quantity: Math.max(0, parseInt(delta)),
          unit: unit || 'BOTTLE',
        },
      });

      // Ensure quantity doesn't go negative
      if (stockLevel.quantity < 0) {
        throw new Error('Stock insuficiente');
      }

      // Create movement record
      const movement = await tx.movement.create({
        data: {
          productId: parseInt(productId),
          warehouseId: parseInt(warehouseId),
          userId: parseInt(userId),
          delta: parseInt(delta),
          unit: unit || 'BOTTLE',
          reason,
        },
      });

      return { stockLevel, movement };
    });
  },

  // Transfer stock between warehouses
  async transferStock({ fromWarehouseId, toWarehouseId, productId, quantity, userId }) {
    return prisma.$transaction(async (tx) => {
      const qty = parseInt(quantity);

      // Check source stock
      const sourceStock = await tx.stockLevel.findUnique({
        where: {
          warehouseId_productId_unit: {
            warehouseId: parseInt(fromWarehouseId),
            productId: parseInt(productId),
            unit: 'BOTTLE',
          },
        },
      });

      if (!sourceStock || sourceStock.quantity < qty) {
        throw new Error('Stock insuficiente en depósito origen');
      }

      // Decrease source
      await tx.stockLevel.update({
        where: {
          warehouseId_productId_unit: {
            warehouseId: parseInt(fromWarehouseId),
            productId: parseInt(productId),
            unit: 'BOTTLE',
          },
        },
        data: { quantity: { decrement: qty } },
      });

      // Increase destination
      await tx.stockLevel.upsert({
        where: {
          warehouseId_productId_unit: {
            warehouseId: parseInt(toWarehouseId),
            productId: parseInt(productId),
            unit: 'BOTTLE',
          },
        },
        update: { quantity: { increment: qty } },
        create: {
          warehouseId: parseInt(toWarehouseId),
          productId: parseInt(productId),
          quantity: qty,
          unit: 'BOTTLE',
        },
      });

      // Get warehouse names for reason
      const [fromWh, toWh] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: parseInt(fromWarehouseId) } }),
        tx.warehouse.findUnique({ where: { id: parseInt(toWarehouseId) } }),
      ]);

      // Create movements
      await tx.movement.create({
        data: {
          productId: parseInt(productId),
          warehouseId: parseInt(fromWarehouseId),
          userId: parseInt(userId),
          delta: -qty,
          unit: 'BOTTLE',
          reason: `Transferencia a ${toWh.name}`,
        },
      });

      await tx.movement.create({
        data: {
          productId: parseInt(productId),
          warehouseId: parseInt(toWarehouseId),
          userId: parseInt(userId),
          delta: qty,
          unit: 'BOTTLE',
          reason: `Transferencia desde ${fromWh.name}`,
        },
      });

      return { success: true };
    });
  },

  // Get movements history
  async getMovements({ productId = null, warehouseId = null, limit = 50 } = {}) {
    const where = {};

    if (productId) where.productId = parseInt(productId);
    if (warehouseId) where.warehouseId = parseInt(warehouseId);

    return prisma.movement.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  // Get low stock alerts
  async getLowStockAlerts(threshold = 10) {
    return prisma.stockLevel.findMany({
      where: {
        quantity: { lte: threshold },
      },
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: { quantity: 'asc' },
    });
  },
};

module.exports = stockService;
