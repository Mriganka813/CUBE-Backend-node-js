const express = require("express");
const {
  getAllUserDetails,
  getSingleUserDetail,
} = require("../controllers/adminController");
const {
  registerConsumer,
  loginConsumer,
  consumerLogout,
  getContactNumber,
  getSellersAndSearch,
  getSellers,
  getProductsOfUser,
  getSellersByName,
  getProductNamesandSearch,
  addClick,
  addClickProduct,
  addClickSeller,
  getTopClickedProducts,
  getTopClickedSellers,
} = require("../controllers/consumerController");
const {
  getAllInventoriesAndSearch,
  getInventoryDetails,
  getAllInventorieswithSearch,
} = require("../controllers/inventoryController");
const { isAuthenticatedConsumer } = require("../middleware/auth");

const router = express.Router();

router.route("/register").post(registerConsumer);

router.route("/login").post(loginConsumer);

router.route("/logout").get(consumerLogout);

router
  .route("/sellers/all")
  .get(isAuthenticatedConsumer, getAllUserDetails);

router
  .route("/seller/:id")
  .get(isAuthenticatedConsumer, getSingleUserDetail);

router
  .route("/product/:id")
  .get(isAuthenticatedConsumer, getInventoryDetails);
router
  .route("/products/all")
  .get(isAuthenticatedConsumer, getAllInventorieswithSearch);

router
  .route("/sellercontact/:id")
  .get(isAuthenticatedConsumer, getContactNumber);

router.route("/getSellersAndSearch").get( isAuthenticatedConsumer , getSellersAndSearch);

router.route("/sellers").get(isAuthenticatedConsumer , getSellers);

router.route("/sellerProduct/:id").get(isAuthenticatedConsumer , getProductsOfUser);

router.route("/sellers/search").get(isAuthenticatedConsumer , getSellersByName);

router.route("/productname/search").get(isAuthenticatedConsumer , getProductNamesandSearch);

router.route("/product/click/:id").get(isAuthenticatedConsumer , addClickProduct);

router.route("/seller/click/:id").get(isAuthenticatedConsumer , addClickSeller);

router.route("/products/popular/:id").get(isAuthenticatedConsumer , getTopClickedProducts);

router.route("/popular/seller").get(isAuthenticatedConsumer , getTopClickedSellers);
module.exports = router;
