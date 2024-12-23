const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model");
const User = require("../../models/user.model");

const productHelper = require("../../helper/products");

//[GET] /checkout
module.exports.index = async (req, res) => {
  const cartId = req.cookies.cartId;
  const cart = await Cart.findOne({
    _id: cartId,
  });
  let newProducts = [];
  if (cart.products.length > 0) {
    let products = [];
    for (const item of cart.products) {
      const product = await Product.findOne({
        _id: item.product_id,
      });
      product.quantity = item.quantity;
      products.push(product);
    }
    newProducts = productHelper.priceNewProducts(products);
  }
  const user = await User.findOne({
    tokenUser: req.cookies.tokenUser,
  });
  res.render("client/pages/checkout/index", {
    pageTitle: "Đặt hàng",
    products: newProducts,
    user: user,
  });
};

//[POST] /checkout/order
module.exports.order = async (req, res) => {
  const cartId = req.cookies.cartId;
  const userInfo = req.body;

  const cart = await Cart.findOne({
    _id: cartId,
  });

  let products = [];
  for (product of cart.products) {
    const objectProduct = {
      product_id: product.product_id,
      price: 0,
      discountPercentage: 0,
      quantity: product.quantity,
    };
    const productInfo = await Product.findOne({
      _id: product.product_id,
    });
    objectProduct.price = productInfo.price;
    objectProduct.discountPercentage = productInfo.discountPercentage;
    products.push(objectProduct);
  }

  const objectOrder = {
    cart_id: String,
    userInfo: userInfo,
    products: products,
  };

  const order = new Order(objectOrder);
  await order.save();
  await Cart.updateOne(
    {
      _id: cartId,
    },
    {
      products: [],
    }
  );
  res.redirect(`/checkout/success/${order.id}`);
};

//[GET] /checkout/success/:orderId
module.exports.success = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
  });
  const tokenUser = req.cookies.tokenUser;
  for (const product of order.products) {
    const productInfo = await Product.findOne({
      _id: product.product_id,
    }).select("title thumbnail");
    product.productInfo = productInfo;
    product.priceNew = productHelper.priceNewProduct(product);
    product.totalPrice = product.priceNew * product.quantity;
  }
  order.totalPrice = order.products.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  const newOrder = {
    products: order.products.map((product) => ({
      product_id: product.product_id,
      quantity: product.quantity,
    })),
    totalPrice: order.totalPrice.toString(),
    createdAt: Date.now(),
  };

  await User.updateOne(
    {
      tokenUser: tokenUser,
    },
    {
      $push: {
        orders: newOrder,
      },
    }
  );
  res.render("client/pages/checkout/success", {
    pageTitle: "Thanh toán thành công",
    order: order,
  });
};
