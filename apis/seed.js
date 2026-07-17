/**
 * Basic DB seed for wellness panels (admin / franchise / distributor / theme)
 *
 * Run:  node seed.js
 *   or: npm run seed
 *
 * Safe to re-run — skips records that already exist.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserData = require('./MODALS/userData');
const Franchise = require('./MODALS/Franchise');
const Distributor = require('./MODALS/Distributor');
const Brand = require('./MODALS/Brand');
const Category = require('./MODALS/Category');
const Package = require('./MODALS/Package');
const Product = require('./MODALS/Product');
const Inventory = require('./MODALS/Inventory');
const Notification = require('./MODALS/Notification');
const { PermissionRoute } = require('./MODALS/Permission');
const wellnessPermissionSeed = require('./SERVICES/WellnessPermissionSeed');

const DEFAULT_PASSWORD = 'Admin@123';

const EXTRA_PERMISSIONS = [
  // Admin auth + bootstrap
  { route: '/login', routeFor: 'admin', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Admin login' },
  { route: '/seed-wellness-permissions', routeFor: 'admin', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Bootstrap wellness permissions' },
];

function buildUri() {
  const dbName = process.env.DB_NAME || 'wellness';
  // Match connections.js local setup
  return `mongodb://localhost:27017/${dbName}`;
}

async function upsertPermission(perm) {
  const exists = await PermissionRoute.findOne({
    route: perm.route,
    routeFor: perm.routeFor,
    method: perm.method,
  });
  if (exists) return 'skipped';
  await new PermissionRoute(perm).save();
  return 'created';
}

async function ensureUser({ uid, username, name, email, mobile, roles, user_type, sponsor_Id = 0 }) {
  const existing = await UserData.findOne({ $or: [{ uid }, { username }] });
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  if (existing) {
    // Keep seed logins predictable for local/dev
    await UserData.updateOne(
      { _id: existing._id },
      {
        $set: {
          password,
          roles,
          user_type,
          status: 1,
          blockStatus: 0,
          lastActivity: new Date(),
        },
      }
    );
    const refreshed = await UserData.findById(existing._id);
    return { user: refreshed, created: false, passwordReset: true };
  }

  const validity = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const user = await new UserData({
    uid,
    username,
    name,
    email,
    mobile,
    password,
    roles,
    user_type,
    status: 1,
    sponsor_Id,
    joining_date: new Date(),
    lastActivity: new Date(),
    id_card_validity: validity,
    blockStatus: 0,
  }).save();

  return { user, created: true, passwordReset: false };
}

async function seedPermissions() {
  let created = 0;
  let skipped = 0;

  for (const perm of EXTRA_PERMISSIONS) {
    const result = await upsertPermission(perm);
    if (result === 'created') created += 1;
    else skipped += 1;
  }

  const wellness = await wellnessPermissionSeed.seed();
  if (!wellness.success) {
    throw new Error(wellness.error || 'Wellness permission seed failed');
  }

  return {
    extra: { created, skipped },
    wellness: { created: wellness.created, skipped: wellness.skipped },
  };
}

async function seedUsers() {
  const admin = await ensureUser({
    uid: 1,
    username: 'admin',
    name: 'Super Admin',
    email: 'admin@wellness.local',
    mobile: '9000000001',
    roles: ['admin'],
    user_type: 'mlm',
  });

  const franchiseUser = await ensureUser({
    uid: 2,
    username: 'franchise1',
    name: 'Demo Franchise Owner',
    email: 'franchise1@wellness.local',
    mobile: '9000000002',
    roles: ['franchise'],
    user_type: 'franchise',
    sponsor_Id: 1,
  });

  let franchiseDoc = await Franchise.findOne({ uid: franchiseUser.user.uid });
  let franchiseCreated = false;
  if (!franchiseDoc) {
    franchiseDoc = await new Franchise({
      uid: franchiseUser.user.uid,
      business_name: 'Demo Wellness Franchise',
      owner_name: 'Demo Franchise Owner',
      email: 'franchise1@wellness.local',
      mobile: '9000000002',
      address: {
        line1: '12 Health Street',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
        country: 'India',
      },
      gst_number: '08DEMOFR1234Z1',
      status: 'active',
      joining_date: new Date(),
      id_card_validity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      created_by: 1,
    }).save();
    franchiseCreated = true;
  }

  const distributorUser = await ensureUser({
    uid: 3,
    username: 'distributor1',
    name: 'Demo Distributor',
    email: 'distributor1@wellness.local',
    mobile: '9000000003',
    roles: ['distributor'],
    user_type: 'distributor',
    sponsor_Id: franchiseUser.user.uid,
  });

  let distributorDoc = await Distributor.findOne({ uid: distributorUser.user.uid });
  let distributorCreated = false;
  if (!distributorDoc) {
    distributorDoc = await new Distributor({
      uid: distributorUser.user.uid,
      name: 'Demo Distributor',
      email: 'distributor1@wellness.local',
      mobile: '9000000003',
      sponsor_Id: franchiseUser.user.uid,
      sponsor_uid: franchiseUser.user.uid,
      address: {
        line1: '45 Trade Road',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302002',
        country: 'India',
      },
      status: 'active',
      joining_date: new Date(),
      id_card_validity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }).save();
    distributorCreated = true;
  }

  const themeUser = await ensureUser({
    uid: 4,
    username: 'theme1',
    name: 'Demo Customer',
    email: 'theme1@wellness.local',
    mobile: '9000000004',
    roles: ['theme'],
    user_type: 'theme',
    sponsor_Id: 0,
  });

  return {
    admin,
    franchiseUser,
    franchiseDoc,
    franchiseCreated,
    distributorUser,
    distributorDoc,
    distributorCreated,
    themeUser,
  };
}

async function seedCatalog(adminUid) {
  let brand = await Brand.findOne({ slug: 'wellness-care' });
  let brandCreated = false;
  if (!brand) {
    brand = await new Brand({
      name: 'Wellness Care',
      slug: 'wellness-care',
      description: 'Default wellness brand',
      status: 'enabled',
      created_by: adminUid,
    }).save();
    brandCreated = true;
  }

  let category = await Category.findOne({ slug: 'supplements' });
  let categoryCreated = false;
  if (!category) {
    category = await new Category({
      name: 'Supplements',
      slug: 'supplements',
      description: 'Health supplements',
      status: 'enabled',
      created_by: adminUid,
    }).save();
    categoryCreated = true;
  }

  let pkg = await Package.findOne({ name: 'Starter Pack' });
  let packageCreated = false;
  if (!pkg) {
    pkg = await new Package({
      name: 'Starter Pack',
      price: 1999,
      description: 'Basic wellness starter package',
      benefits: ['Immunity support', 'Daily nutrition'],
      status: 'active',
      created_by: adminUid,
    }).save();
    packageCreated = true;
  }

  let product = await Product.findOne({ sku: 'WC-VIT-C-60' });
  let productCreated = false;
  if (!product) {
    product = await new Product({
      product_name: 'Vitamin C 1000mg',
      sku: 'WC-VIT-C-60',
      categoryId: category.categoryId,
      brandId: brand.brandId,
      packageId: pkg.packageId,
      description: 'Daily vitamin C tablets',
      benefits: ['Immunity', 'Antioxidant'],
      weight: '60 tablets',
      gst: 12,
      mrp: 599,
      distributor_price: 399,
      franchise_price: 299,
      stock: 500,
      status: 'enabled',
      created_by: adminUid,
      expiry_date: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000),
    }).save();
    productCreated = true;
  }

  return {
    brand,
    brandCreated,
    category,
    categoryCreated,
    package: pkg,
    packageCreated,
    product,
    productCreated,
  };
}

async function seedInventory(franchiseDoc, product) {
  if (!franchiseDoc || !product) return { created: false };

  const existing = await Inventory.findOne({
    franchiseId: franchiseDoc.franchiseId,
    productId: product.productId,
  });
  if (existing) return { inventory: existing, created: false };

  const inventory = await new Inventory({
    franchiseId: franchiseDoc.franchiseId,
    franchise_uid: franchiseDoc.uid,
    productId: product.productId,
    sku: product.sku,
    available_stock: 100,
    purchased_stock: 100,
    reserved_stock: 0,
    sold_stock: 0,
    returned_stock: 0,
    damaged_stock: 0,
    status: 'active',
  }).save();

  return { inventory, created: true };
}

async function seedNotifications(users) {
  const samples = [
    {
      uid: users.franchiseUser.user.uid,
      role: 'franchise',
      title: 'Welcome Franchise',
      message: 'Your franchise account is ready. Explore the dashboard.',
    },
    {
      uid: users.distributorUser.user.uid,
      role: 'distributor',
      title: 'Welcome Distributor',
      message: 'Your distributor account is ready. Start placing orders.',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const item of samples) {
    const exists = await Notification.findOne({
      uid: item.uid,
      role: item.role,
      title: item.title,
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const payload = {
      uid: item.uid,
      role: item.role,
      type: 'registration',
      title: item.title,
      message: item.message,
      is_read: 0,
      created_date: new Date(),
    };

    try {
      await new Notification(payload).save();
      created += 1;
    } catch (err) {
      skipped += 1;
      console.warn(`Notification seed skipped: ${err.message}`);
    }
  }

  return { created, skipped };
}

async function run() {
  const uri = buildUri();
  console.log(`Connecting: ${uri}`);

  await mongoose.connect(uri);

  console.log('Connected. Seeding...\n');

  const permissions = await seedPermissions();
  console.log('Permissions:', permissions);

  const users = await seedUsers();
  console.log('Users:');
  console.log(`  admin        -> ${users.admin.created ? 'created' : 'exists'} (username: admin)`);
  console.log(`  franchise1   -> ${users.franchiseUser.created ? 'created' : 'exists'}`);
  console.log(`  franchiseDoc -> ${users.franchiseCreated ? 'created' : 'exists'} (id: ${users.franchiseDoc.franchiseId})`);
  console.log(`  distributor1 -> ${users.distributorUser.created ? 'created' : 'exists'}`);
  console.log(`  distributor  -> ${users.distributorCreated ? 'created' : 'exists'} (id: ${users.distributorDoc.distributorId})`);
  console.log(`  theme1       -> ${users.themeUser.created ? 'created' : 'exists'}`);

  const catalog = await seedCatalog(users.admin.user.uid);
  console.log('Catalog:');
  console.log(`  brand    -> ${catalog.brandCreated ? 'created' : 'exists'} (${catalog.brand.name})`);
  console.log(`  category -> ${catalog.categoryCreated ? 'created' : 'exists'} (${catalog.category.name})`);
  console.log(`  package  -> ${catalog.packageCreated ? 'created' : 'exists'} (${catalog.package.name})`);
  console.log(`  product  -> ${catalog.productCreated ? 'created' : 'exists'} (${catalog.product.sku})`);

  const inventory = await seedInventory(users.franchiseDoc, catalog.product);
  console.log(`Inventory -> ${inventory.created ? 'created' : 'exists'}`);

  const notifications = await seedNotifications(users);
  console.log('Notifications:', notifications);

  console.log('\n----------------------------------------');
  console.log('Login credentials (password for all):');
  console.log(`  ${DEFAULT_PASSWORD}`);
  console.log('  admin         / Admin Panel');
  console.log('  franchise1    / Franchise Panel');
  console.log('  distributor1  / Distributor Panel');
  console.log('  theme1        / Theme');
  console.log('----------------------------------------\n');

  await mongoose.disconnect();
  console.log('Seed completed.');
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
