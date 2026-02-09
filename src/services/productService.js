const prisma = require('../config/database');

const productService = {
  async findAll({ search = '', page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
            { company: { contains: search } },
            { varietal: { contains: search } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stockLevels: {
            include: { warehouse: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id) {
    return prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        stockLevels: {
          include: { warehouse: true },
        },
        prices: {
          include: { priceList: true },
        },
      },
    });
  },

  async findBySku(sku) {
    return prisma.product.findUnique({
      where: { sku },
    });
  },

  async create(data) {
    return prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        company: data.company,
        presentation: data.presentation,
        vintage: data.vintage || null,
        varietal: data.varietal || null,
        imageUrl: data.imageUrl || null,
        bottlesPerBox: parseInt(data.bottlesPerBox) || 6,
      },
    });
  },

  async update(id, data) {
    return prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        sku: data.sku,
        name: data.name,
        company: data.company,
        presentation: data.presentation,
        vintage: data.vintage || null,
        varietal: data.varietal || null,
        imageUrl: data.imageUrl || null,
        bottlesPerBox: parseInt(data.bottlesPerBox) || 6,
      },
    });
  },

  async delete(id) {
    return prisma.product.delete({
      where: { id: parseInt(id) },
    });
  },

  async getTotalStock(productId) {
    const stockLevels = await prisma.stockLevel.findMany({
      where: { productId: parseInt(productId) },
    });

    return stockLevels.reduce((total, sl) => total + sl.quantity, 0);
  },
};

module.exports = productService;
