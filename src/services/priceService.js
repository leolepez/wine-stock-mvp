const prisma = require('../config/database');

const priceService = {
  // Price Lists
  async findAllLists() {
    return prisma.priceList.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { prices: true } },
      },
    });
  },

  async findListById(id) {
    return prisma.priceList.findUnique({
      where: { id: parseInt(id) },
      include: {
        prices: {
          include: { product: true },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });
  },

  async createList(data) {
    return prisma.priceList.create({
      data: {
        name: data.name,
        active: data.active === 'true' || data.active === true,
      },
    });
  },

  async updateList(id, data) {
    return prisma.priceList.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        active: data.active === 'true' || data.active === true,
      },
    });
  },

  async deleteList(id) {
    return prisma.priceList.delete({
      where: { id: parseInt(id) },
    });
  },

  // Prices
  async findPricesByList(priceListId) {
    return prisma.price.findMany({
      where: { priceListId: parseInt(priceListId) },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });
  },

  async findPrice(priceListId, productId) {
    return prisma.price.findUnique({
      where: {
        priceListId_productId: {
          priceListId: parseInt(priceListId),
          productId: parseInt(productId),
        },
      },
      include: { product: true, priceList: true },
    });
  },

  async upsertPrice(priceListId, productId, data) {
    return prisma.price.upsert({
      where: {
        priceListId_productId: {
          priceListId: parseInt(priceListId),
          productId: parseInt(productId),
        },
      },
      update: {
        basePrice: parseFloat(data.basePrice),
        ivaPercent: parseFloat(data.ivaPercent),
        currency: data.currency || 'ARS',
      },
      create: {
        priceListId: parseInt(priceListId),
        productId: parseInt(productId),
        basePrice: parseFloat(data.basePrice),
        ivaPercent: parseFloat(data.ivaPercent),
        currency: data.currency || 'ARS',
      },
    });
  },

  async deletePrice(priceListId, productId) {
    return prisma.price.delete({
      where: {
        priceListId_productId: {
          priceListId: parseInt(priceListId),
          productId: parseInt(productId),
        },
      },
    });
  },

  async bulkUpdatePrices(priceListId, pricesData) {
    const operations = pricesData.map((p) =>
      prisma.price.upsert({
        where: {
          priceListId_productId: {
            priceListId: parseInt(priceListId),
            productId: parseInt(p.productId),
          },
        },
        update: {
          basePrice: parseFloat(p.basePrice),
          ivaPercent: parseFloat(p.ivaPercent),
          currency: p.currency || 'ARS',
        },
        create: {
          priceListId: parseInt(priceListId),
          productId: parseInt(p.productId),
          basePrice: parseFloat(p.basePrice),
          ivaPercent: parseFloat(p.ivaPercent),
          currency: p.currency || 'ARS',
        },
      })
    );

    return prisma.$transaction(operations);
  },

  // Get all products with their prices for a specific list
  async getProductsWithPrices(priceListId) {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        prices: {
          where: { priceListId: parseInt(priceListId) },
        },
      },
    });

    return products.map((product) => ({
      ...product,
      price: product.prices[0] || null,
    }));
  },
};

module.exports = priceService;
