const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  await prisma.$transaction(async (tx) => {
    // 1. USERS
    console.log('👤 Creating users...');
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const managerHash = await bcrypt.hash('Manager123!', 10);
    const viewerHash = await bcrypt.hash('Viewer123!', 10);

    const admin = await tx.user.create({
      data: {
        email: 'admin@wine.com',
        passwordHash: adminHash,
        role: 'ADMIN',
      },
    });

    const manager = await tx.user.create({
      data: {
        email: 'manager@wine.com',
        passwordHash: managerHash,
        role: 'MANAGER',
      },
    });

    const viewer = await tx.user.create({
      data: {
        email: 'viewer@wine.com',
        passwordHash: viewerHash,
        role: 'VIEWER',
      },
    });

    console.log(`   ✓ Created ${admin.email} (ADMIN)`);
    console.log(`   ✓ Created ${manager.email} (MANAGER)`);
    console.log(`   ✓ Created ${viewer.email} (VIEWER)\n`);

    // 2. WAREHOUSES
    console.log('🏭 Creating warehouses...');
    const warehouseCentral = await tx.warehouse.create({
      data: {
        name: 'Depósito Central',
        code: 'DC01',
      },
    });

    const warehouseSur = await tx.warehouse.create({
      data: {
        name: 'Depósito Sur',
        code: 'DS01',
      },
    });

    console.log(`   ✓ Created ${warehouseCentral.name} (${warehouseCentral.code})`);
    console.log(`   ✓ Created ${warehouseSur.name} (${warehouseSur.code})\n`);

    // 3. PRICE LISTS
    console.log('💰 Creating price lists...');
    const priceListGeneral = await tx.priceList.create({
      data: {
        name: 'General',
        active: true,
      },
    });

    const priceListMayorista = await tx.priceList.create({
      data: {
        name: 'Mayorista',
        active: true,
      },
    });

    const priceListDistribuidor = await tx.priceList.create({
      data: {
        name: 'Distribuidor',
        active: false,
      },
    });

    console.log(`   ✓ Created ${priceListGeneral.name} (active)`);
    console.log(`   ✓ Created ${priceListMayorista.name} (active)`);
    console.log(`   ✓ Created ${priceListDistribuidor.name} (inactive)\n`);

    // 4. PRODUCTS
    console.log('🍷 Creating products...');
    const productsData = [
      {
        sku: 'MAL001',
        name: 'Malbec Reserva 2020',
        company: 'Bodega Norton',
        presentation: '750ml',
        vintage: '2020',
        varietal: 'Malbec',
        bottlesPerBox: 6,
        basePrice: 4500,
      },
      {
        sku: 'CAB002',
        name: 'Cabernet Sauvignon Gran Reserva',
        company: 'Catena Zapata',
        presentation: '750ml',
        vintage: '2019',
        varietal: 'Cabernet Sauvignon',
        bottlesPerBox: 6,
        basePrice: 7800,
      },
      {
        sku: 'TOR003',
        name: 'Torrontés Valle de Cafayate',
        company: 'Trapiche',
        presentation: '750ml',
        vintage: '2022',
        varietal: 'Torrontés',
        bottlesPerBox: 6,
        basePrice: 2500,
      },
      {
        sku: 'BON004',
        name: 'Bonarda Organic',
        company: 'Luigi Bosca',
        presentation: '750ml',
        vintage: '2021',
        varietal: 'Bonarda',
        bottlesPerBox: 6,
        basePrice: 3200,
      },
      {
        sku: 'CHA005',
        name: 'Chardonnay Barrel Fermented',
        company: 'Rutini Wines',
        presentation: '750ml',
        vintage: '2021',
        varietal: 'Chardonnay',
        bottlesPerBox: 6,
        basePrice: 5600,
      },
    ];

    const products = [];
    for (const productData of productsData) {
      const { basePrice, ...productFields } = productData;
      const product = await tx.product.create({
        data: {
          ...productFields,
          imageUrl: null,
        },
      });
      products.push({ ...product, basePrice });
      console.log(`   ✓ Created ${product.name} (${product.sku})`);
    }
    console.log('');

    // 5. STOCK LEVELS
    console.log('📦 Creating stock levels...');
    const stockQuantities = [
      { central: 120, sur: 85 },
      { central: 150, sur: 95 },
      { central: 80, sur: 50 },
      { central: 95, sur: 70 },
      { central: 110, sur: 60 },
    ];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const quantities = stockQuantities[i];

      await tx.stockLevel.create({
        data: {
          warehouseId: warehouseCentral.id,
          productId: product.id,
          quantity: quantities.central,
          unit: 'BOTTLE',
        },
      });

      await tx.stockLevel.create({
        data: {
          warehouseId: warehouseSur.id,
          productId: product.id,
          quantity: quantities.sur,
          unit: 'BOTTLE',
        },
      });

      console.log(`   ✓ Stock for ${product.name}: DC01=${quantities.central}, DS01=${quantities.sur}`);
    }
    console.log('');

    // 6. PRICES
    console.log('💵 Creating prices...');
    for (const product of products) {
      const basePriceGeneral = product.basePrice;
      const basePriceMayorista = basePriceGeneral * 0.85; // 15% discount
      const basePriceDistribuidor = basePriceGeneral * 0.75; // 25% discount

      await tx.price.create({
        data: {
          priceListId: priceListGeneral.id,
          productId: product.id,
          basePrice: basePriceGeneral,
          ivaPercent: 21,
          currency: 'ARS',
        },
      });

      await tx.price.create({
        data: {
          priceListId: priceListMayorista.id,
          productId: product.id,
          basePrice: basePriceMayorista,
          ivaPercent: 21,
          currency: 'ARS',
        },
      });

      await tx.price.create({
        data: {
          priceListId: priceListDistribuidor.id,
          productId: product.id,
          basePrice: basePriceDistribuidor,
          ivaPercent: 21,
          currency: 'ARS',
        },
      });

      console.log(`   ✓ Prices for ${product.sku}: General=$${basePriceGeneral}, Mayorista=$${basePriceMayorista.toFixed(2)}, Dist=$${basePriceDistribuidor.toFixed(2)}`);
    }
    console.log('');

    // 7. MOVEMENTS
    console.log('📊 Creating movements...');
    const movementTypes = [
      { reason: 'Recepción proveedor', delta: 50 },
      { reason: 'Ajuste inventario', delta: -10 },
      { reason: 'Recepción proveedor', delta: 30 },
      { reason: 'Merma', delta: -5 },
      { reason: 'Recepción proveedor', delta: 20 },
    ];

    const users = [admin, manager];
    let movementCount = 0;

    for (const product of products) {
      // 2-3 movements per product
      const numMovements = Math.random() > 0.5 ? 3 : 2;

      for (let i = 0; i < numMovements; i++) {
        const movement = movementTypes[i];
        const warehouse = Math.random() > 0.5 ? warehouseCentral : warehouseSur;
        const user = users[Math.floor(Math.random() * users.length)];

        // Random date in last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        await tx.movement.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            userId: user.id,
            delta: movement.delta,
            unit: 'BOTTLE',
            reason: movement.reason,
            createdAt,
          },
        });

        movementCount++;
      }
    }
    console.log(`   ✓ Created ${movementCount} movements across all products\n`);
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   • 3 users (admin, manager, viewer)');
  console.log('   • 2 warehouses');
  console.log('   • 3 price lists');
  console.log('   • 5 products (Argentine wines)');
  console.log('   • 10 stock levels (5 products × 2 warehouses)');
  console.log('   • 15 prices (5 products × 3 price lists)');
  console.log('   • 12-15 movements (historical data)\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
