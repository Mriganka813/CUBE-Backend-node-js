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
} = require("../controllers/consumerController");
const {
  getAllInventoriesAndSearch,
  getInventoryDetails,
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
  .get(isAuthenticatedConsumer, getAllInventoriesAndSearch);

router
  .route("/sellercontact/:id")
  .get(isAuthenticatedConsumer, getContactNumber);

router.route("/getSellersAndSearch").get( isAuthenticatedConsumer , getSellersAndSearch);

router.route("/sellers").get(isAuthenticatedConsumer , getSellers);

router.route("/sellerProduct/:id").get(isAuthenticatedConsumer , getProductsOfUser);

module.exports = router;
