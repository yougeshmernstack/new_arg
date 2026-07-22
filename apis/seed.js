/**
 * Basic DB seed for wellness panels (admin / franchise / distributor / theme)
 *
 * Separate identity tables + separate wallets — NOT shared UserData roles.
 *
 * Run:  node seed.js
 *   or: npm run seed
 *
 * Safe to re-run — skips / updates records that already exist.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('./MODALS/Counter');
require('./MODALS/wallets');

const AdminData = require('./MODALS/AdminData');
const Franchise = require('./MODALS/Franchise');
const Distributor = require('./MODALS/Distributor');
const ThemeUser = require('./MODALS/ThemeUser');
const AdminWallet = require('./MODALS/AdminWallet');
const FranchiseWallet = require('./MODALS/FranchiseWallet');
const DistributorWallet = require('./MODALS/DistributorWallet');
const ThemeUserWallet = require('./MODALS/ThemeUserWallet');
const Brand = require('./MODALS/Brand');
const Category = require('./MODALS/Category');
const Package = require('./MODALS/Package');
const Product = require('./MODALS/Product');
const Inventory = require('./MODALS/Inventory');
const PlansInfo = require('./MODALS/Plan');
const { PermissionRoute } = require('./MODALS/Permission');
const wellnessPermissionSeed = require('./SERVICES/WellnessPermissionSeed');
const { ensurePanelWallet } = require('./utils/panelWallet');

const Counter = mongoose.model('Counter');
const DEFAULT_PASSWORD = 'Admin@123';

const EXTRA_PERMISSIONS = [
  { route: '/login', routeFor: 'admin', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Admin login' },
  { route: '/seed-wellness-permissions', routeFor: 'admin', method: 'POST', roles: ['public'], menuMeta: { showInMenu: false }, description: 'Bootstrap wellness permissions' },
];

function buildUri() {
  const dbName = process.env.DB_NAME || 'wellness';
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

async function ensureCounter(ID, seq) {
  const existing = await Counter.findOne({ ID });
  if (!existing) {
    await new Counter({ ID, seq }).save();
    return;
  }
  if (existing.seq < seq) {
    await Counter.updateOne({ ID }, { $set: { seq } });
  }
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

async function ensureAdmin() {
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let admin = await AdminData.findOne({ $or: [{ uid: 1 }, { username: 'admin' }] });
  let created = false;

  if (admin) {
    await AdminData.updateOne(
      { _id: admin._id },
      {
        $set: {
          password,
          roles: ['admin'],
          status: 1,
          blockStatus: 0,
          name: 'Super Admin',
          email: 'admin@wellness.local',
          mobile: '9000000001',
          lastActivity: new Date(),
        },
      }
    );
    admin = await AdminData.findById(admin._id);
  } else {
    admin = await new AdminData({
      uid: 1,
      username: 'admin',
      password,
      name: 'Super Admin',
      email: 'admin@wellness.local',
      mobile: '9000000001',
      roles: ['admin'],
      status: 1,
      blockStatus: 0,
      joining_date: new Date(),
      lastActivity: new Date(),
    }).save();
    created = true;
  }

  const wallet = await ensurePanelWallet(AdminWallet, admin.uid);
  await ensureCounter('admin_uid', admin.uid);
  return { admin, created, walletCreated: wallet.created };
}

async function ensureFranchise(adminUid) {
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let franchise = await Franchise.findOne({ $or: [{ uid: 1 }, { username: 'franchise1' }] });
  let created = false;

  if (franchise) {
    await Franchise.updateOne(
      { _id: franchise._id },
      {
        $set: {
          password,
          business_name: 'Demo Wellness Franchise',
          owner_name: 'Demo Franchise Owner',
          email: 'franchise1@wellness.local',
          mobile: '9000000002',
          status: 'active',
          blockStatus: 0,
          lastActivity: new Date(),
        },
      }
    );
    franchise = await Franchise.findById(franchise._id);
  } else {
    franchise = await new Franchise({
      uid: 1,
      username: 'franchise1',
      password,
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
      created_by: adminUid,
      lastActivity: new Date(),
    }).save();
    created = true;
  }

  const wallet = await ensurePanelWallet(FranchiseWallet, franchise.uid);
  await ensureCounter('franchise_uid', franchise.uid);
  return { franchise, created, walletCreated: wallet.created };
}

async function ensureDistributor(franchise) {
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let distributor = await Distributor.findOne({ $or: [{ uid: 1 }, { username: 'distributor1' }] });
  let created = false;

  if (distributor) {
    await Distributor.updateOne(
      { _id: distributor._id },
      {
        $set: {
          password,
          name: 'Demo Distributor',
          email: 'distributor1@wellness.local',
          mobile: '9000000003',
          sponsor_Id: franchise.uid,
          sponsor_uid: franchise.uid,
          sponsor_type: 'franchise',
          status: 'active',
          blockStatus: 0,
          lastActivity: new Date(),
        },
      }
    );
    distributor = await Distributor.findById(distributor._id);
  } else {
    distributor = await new Distributor({
      uid: 1,
      username: 'distributor1',
      password,
      name: 'Demo Distributor',
      email: 'distributor1@wellness.local',
      mobile: '9000000003',
      sponsor_Id: franchise.uid,
      sponsor_uid: franchise.uid,
      sponsor_type: 'franchise',
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
      lastActivity: new Date(),
    }).save();
    created = true;
  }

  const wallet = await ensurePanelWallet(DistributorWallet, distributor.uid);
  await ensureCounter('distributor_uid', distributor.uid);
  return { distributor, created, walletCreated: wallet.created };
}

/**
 * Sample left/right children under distributor1 so Binary Team is not empty.
 */
async function ensureBinaryDemoTeam(rootDistributor) {
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const rootUid = rootDistributor.uid;
  const samples = [
    {
      uid: 2,
      username: 'distributor2',
      name: 'Demo Left',
      email: 'distributor2@wellness.local',
      mobile: '9000000004',
      position: 'left',
    },
    {
      uid: 3,
      username: 'distributor3',
      name: 'Demo Right',
      email: 'distributor3@wellness.local',
      mobile: '9000000005',
      position: 'right',
    },
  ];

  const results = [];
  for (const sample of samples) {
    let doc = await Distributor.findOne({ $or: [{ uid: sample.uid }, { username: sample.username }] });
    let created = false;
    const payload = {
      password,
      name: sample.name,
      email: sample.email,
      mobile: sample.mobile,
      sponsor_Id: rootUid,
      sponsor_uid: rootUid,
      sponsor_type: 'distributor',
      parent_Id: rootUid,
      position: sample.position,
      status: 'active',
      blockStatus: 0,
      lastActivity: new Date(),
    };

    if (doc) {
      await Distributor.updateOne({ _id: doc._id }, { $set: payload });
      doc = await Distributor.findById(doc._id);
    } else {
      doc = await new Distributor({
        uid: sample.uid,
        username: sample.username,
        ...payload,
        address: {
          line1: 'Binary Demo Lane',
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: '302002',
          country: 'India',
        },
        joining_date: new Date(),
        id_card_validity: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }).save();
      created = true;
    }

    const wallet = await ensurePanelWallet(DistributorWallet, doc.uid);
    await ensureCounter('distributor_uid', doc.uid);
    results.push({ distributor: doc, created, walletCreated: wallet.created });
  }

  return results;
}

async function ensureThemeUser() {
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let themeUser = await ThemeUser.findOne({ $or: [{ uid: 1 }, { username: 'theme1' }] });
  let created = false;

  if (themeUser) {
    await ThemeUser.updateOne(
      { _id: themeUser._id },
      {
        $set: {
          password,
          name: 'Demo Customer',
          email: 'theme1@wellness.local',
          mobile: '9000000004',
          status: 1,
          blockStatus: 0,
          lastActivity: new Date(),
        },
      }
    );
    themeUser = await ThemeUser.findById(themeUser._id);
  } else {
    themeUser = await new ThemeUser({
      uid: 1,
      username: 'theme1',
      password,
      name: 'Demo Customer',
      email: 'theme1@wellness.local',
      mobile: '9000000004',
      status: 1,
      joining_date: new Date(),
      lastActivity: new Date(),
    }).save();
    created = true;
  }

  const wallet = await ensurePanelWallet(ThemeUserWallet, themeUser.uid);
  await ensureCounter('theme_uid', themeUser.uid);
  return { themeUser, created, walletCreated: wallet.created };
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
      amount: 2499,
      discounted_amount: 1999,
      bv: 1000,
      pv: 1000,
      items: [],
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

  // Ensure starter package includes the demo product for activation purchase
  if (product && (!pkg.items || pkg.items.length === 0)) {
    pkg.items = [{ productId: product.productId, quantity: 1 }];
    if (pkg.amount == null || pkg.amount === 0) pkg.amount = 2499;
    if (pkg.discounted_amount == null || pkg.discounted_amount === 0) {
      pkg.discounted_amount = pkg.price || 1999;
    }
    if (pkg.bv == null) pkg.bv = 1000;
    if (pkg.pv == null) pkg.pv = 1000;
    await pkg.save();
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

async function run() {
  const uri = buildUri();
  console.log(`Connecting: ${uri}`);

  await mongoose.connect(uri);

  console.log('Connected. Seeding separate panel tables...\n');

  const permissions = await seedPermissions();
  console.log('Permissions:', permissions);

  const existingPlan = await PlansInfo.findOne({ planId: 1 });
  const planData = await PlansInfo.ensurePlanData();
  console.log(
    `plan_data         -> ${existingPlan ? 'exists' : 'created'} (direct_income: ${planData.direct_income?.amount ?? 15}%)`
  );

  const adminResult = await ensureAdmin();
  const franchiseResult = await ensureFranchise(adminResult.admin.uid);
  const distributorResult = await ensureDistributor(franchiseResult.franchise);
  const binaryTeam = await ensureBinaryDemoTeam(distributorResult.distributor);
  const themeResult = await ensureThemeUser();

  console.log('Identities (separate collections):');
  console.log(`  admin_data         -> ${adminResult.created ? 'created' : 'exists'} (username: admin, uid: ${adminResult.admin.uid})`);
  console.log(`  admin_wallets      -> ${adminResult.walletCreated ? 'created' : 'exists'}`);
  console.log(`  franchise_data     -> ${franchiseResult.created ? 'created' : 'exists'} (username: franchise1, id: ${franchiseResult.franchise.franchiseId})`);
  console.log(`  franchise_wallets  -> ${franchiseResult.walletCreated ? 'created' : 'exists'}`);
  console.log(`  distributor_data   -> ${distributorResult.created ? 'created' : 'exists'} (username: distributor1, id: ${distributorResult.distributor.distributorId})`);
  console.log(`  distributor_wallets -> ${distributorResult.walletCreated ? 'created' : 'exists'}`);
  for (const row of binaryTeam) {
    console.log(
      `  binary child       -> ${row.created ? 'created' : 'exists'} (username: ${row.distributor.username}, ${row.distributor.position} of distributor1)`
    );
  }
  console.log(`  theme_users_data   -> ${themeResult.created ? 'created' : 'exists'} (username: theme1, uid: ${themeResult.themeUser.uid})`);
  console.log(`  theme_user_wallets -> ${themeResult.walletCreated ? 'created' : 'exists'}`);

  const catalog = await seedCatalog(adminResult.admin.uid);
  console.log('Catalog:');
  console.log(`  brand    -> ${catalog.brandCreated ? 'created' : 'exists'} (${catalog.brand.name})`);
  console.log(`  category -> ${catalog.categoryCreated ? 'created' : 'exists'} (${catalog.category.name})`);
  console.log(`  package  -> ${catalog.packageCreated ? 'created' : 'exists'} (${catalog.package.name})`);
  console.log(`  product  -> ${catalog.productCreated ? 'created' : 'exists'} (${catalog.product.sku})`);

  const inventory = await seedInventory(franchiseResult.franchise, catalog.product);
  console.log(`Inventory -> ${inventory.created ? 'created' : 'exists'}`);

  console.log('\n----------------------------------------');
  console.log('Login credentials (password for all):');
  console.log(`  ${DEFAULT_PASSWORD}`);
  console.log('  admin         / Admin Panel      -> admin_data');
  console.log('  franchise1    / Franchise Panel  -> franchise_data');
  console.log('  distributor1  / Distributor Panel-> distributor_data');
  console.log('  distributor2  / left of distributor1');
  console.log('  distributor3  / right of distributor1');
  console.log('  theme1        / Theme            -> theme_users_data');
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
