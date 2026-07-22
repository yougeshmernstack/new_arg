const Product = require('../../MODALS/Product');
const Package = require('../../MODALS/Package');
const WebsiteContent = require('../../MODALS/WebsiteContent');
const LegalDocument = require('../../MODALS/LegalDocument');
const { errorLogger } = require('../../utils/logger');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');

function toCatalogProduct(product) {
  return {
    productId: product.productId,
    product_name: product.product_name,
    sku: product.sku,
    categoryId: product.categoryId,
    brandId: product.brandId,
    packageId: product.packageId,
    description: product.description || '',
    ingredients: product.ingredients || '',
    benefits: product.benefits || [],
    nutrition_facts: product.nutrition_facts || '',
    directions: product.directions || '',
    storage: product.storage || '',
    manufacturing_details: product.manufacturing_details || '',
    weight: product.weight || '',
    images: product.images || [],
    videos: product.videos || [],
    price: product.mrp || 0,
    mrp: product.mrp || 0,
    stock: product.stock || 0,
    out_of_stock: (product.stock || 0) <= 0
  };
}

function toCatalogPackage(pkg, productMap = {}) {
  const items = Array.isArray(pkg.items) ? pkg.items : [];
  const itemNames = items.map((item) => {
    const product = productMap[item.productId];
    const name = product?.product_name || `Product #${item.productId}`;
    return `${name} × ${item.quantity}`;
  });
  const coverProduct = items.map((item) => productMap[item.productId]).find((p) => p?.images?.[0]);

  return {
    packageId: pkg.packageId,
    name: pkg.name,
    price: pkg.discounted_amount ?? pkg.price ?? 0,
    amount: pkg.amount || 0,
    discounted_amount: pkg.discounted_amount ?? pkg.price ?? 0,
    description: pkg.description || '',
    benefits: pkg.benefits || [],
    items,
    itemNames,
    image: coverProduct?.images?.[0] || null,
    status: pkg.status
  };
}

async function loadPackageProductMap(packages) {
  const ids = [
    ...new Set(
      packages.flatMap((pkg) => (Array.isArray(pkg.items) ? pkg.items.map((item) => item.productId) : []))
    )
  ].filter(Boolean);

  if (!ids.length) return {};

  const products = await Product.find({ productId: { $in: ids } })
    .select('productId product_name images')
    .lean();

  return Object.fromEntries(products.map((product) => [product.productId, product]));
}

class THEME_CATALOG {
  async getSiteContent(req, res) {
    try {
      const doc = await WebsiteContent.getOrCreate();
      const obj = doc.toObject();
      return res.status(200).json({
        status: 200,
        message: 'Site content fetched.',
        data: obj
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getLegalDocuments(req, res) {
    try {
      const list = await LegalDocument.find({ status: 'active' })
        .sort({ sortOrder: 1, created_at: -1 })
        .select('-__v -created_by');
      return res.status(200).json({
        status: 200,
        message: 'Legal documents fetched.',
        data: list
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async listProducts(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const skip = (page - 1) * limit;

      const filter = {
        status: 'enabled',
        is_hidden: false
      };
      if (req.query.categoryId) filter.categoryId = Number(req.query.categoryId);
      if (req.query.brandId) filter.brandId = Number(req.query.brandId);
      if (req.query.packageId) filter.packageId = Number(req.query.packageId);
      if (req.query.search) {
        filter.$or = [
          { product_name: { $regex: req.query.search, $options: 'i' } },
          { sku: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      const [list, total] = await Promise.all([
        Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Product.countDocuments(filter)
      ]);

      return res.status(200).json({
        status: 200,
        message: 'Catalog products fetched.',
        data: list.map(toCatalogProduct),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getProduct(req, res) {
    try {
      const productId = Number(req.query.productId || req.params.productId);
      if (!productId) {
        return res.status(400).json({ code: 400, message: 'productId is required.' });
      }
      const product = await Product.findOne({
        productId,
        status: 'enabled',
        is_hidden: false
      });
      if (!product) {
        return res.status(404).json({ code: 404, message: 'Product not found.' });
      }
      return res.status(200).json({
        status: 200,
        message: 'Catalog product fetched.',
        data: toCatalogProduct(product)
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async listPackages(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const skip = (page - 1) * limit;

      const filter = { status: 'active' };
      if (req.query.search) {
        filter.name = { $regex: req.query.search, $options: 'i' };
      }

      const [list, total] = await Promise.all([
        Package.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Package.countDocuments(filter)
      ]);
      const productMap = await loadPackageProductMap(list);

      return res.status(200).json({
        status: 200,
        message: 'Catalog packages fetched.',
        data: list.map((pkg) => toCatalogPackage(pkg, productMap)),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getPackage(req, res) {
    try {
      const packageId = Number(req.query.packageId || req.params.packageId);
      if (!packageId) {
        return res.status(400).json({ code: 400, message: 'packageId is required.' });
      }
      const pkg = await Package.findOne({ packageId, status: 'active' });
      if (!pkg) {
        return res.status(404).json({ code: 404, message: 'Package not found.' });
      }
      const productMap = await loadPackageProductMap([pkg]);
      return res.status(200).json({
        status: 200,
        message: 'Catalog package fetched.',
        data: toCatalogPackage(pkg, productMap)
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

const ThemeCatalog = new THEME_CATALOG();
module.exports = ThemeCatalog;
