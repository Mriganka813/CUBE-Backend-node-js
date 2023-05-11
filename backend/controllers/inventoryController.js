const Inventory = require("../models/inventoryModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const lodash = require("lodash");
const upload = require("../services/upload");
const ApiFeatures = require("../utils/apiFeatures");
exports.findInventoryByBarcode = catchAsyncErrors(async (req, res, next) => {
  const barcode = req.params.code;
  const inventory = await Inventory.findOne({ barCode: barcode });
  res.status(200).json({
    success: true,
    inventory,
  });
});

// Create Inventory


// Get All Inventory count and search
exports.getAllInventoriesAndSearch = catchAsyncErrors(
  async (req, res, next) => {
    const resultPerPage = 8;
    const inventoriesCount = await Inventory.countDocuments();
    const key = req.query.keyword
      ? {
          name: {
            $regex: req.query.keyword,
            $options: "i",
          },
        }
      : {};

    const InventoriesRes = await Inventory.find({ ...key });

    const queryCopy = { ...req.query };

    const removeFields = ["keyword", "page", "limit"];

    removeFields.forEach((key) => delete queryCopy[key]);

    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (key) => `$${key}`);

    let filteredInventories = await Inventory.find(JSON.parse(queryStr));

    let filteredInventoriesCount = InventoriesRes.length;
    const currentPage = Number(req.query.page) || 1;
    const skip = resultPerPage * (currentPage - 1);
    let InventoriesPage = await Inventory.find()
      .limit(resultPerPage)
      .skip(skip);

    res.status(200).json({
      success: true,
      InventoriesRes,
      inventoriesCount,
      resultPerPage,
      filteredInventoriesCount,
      filteredInventories,
      InventoriesPage,
    });
  }
);

// get all inventries and search
exports.getAllInventorieswithSearch = catchAsyncErrors(
  async (req, res, next) => {
    const ApiFeature = new ApiFeatures(
      Inventory.find().populate("user", [
        "phoneNumber",
        "email",
        "address",
        "businessName",
      ]),
      req.query
    )
      .pagination(10)
      .search();
    const inventories = await ApiFeature.query;
    res.status(200).json({
      success: true,
      inventories,
    });
  }
);

// Get All Inventory
exports.getAllInventories = catchAsyncErrors(async (req, res, next) => {
  const Inventories = await Inventory.find();
  res.status(200).json({
    success: true,
    Inventories,
  });
});

exports.getInventoryForUser = catchAsyncErrors(async (req, res, next) => {
  // const inventories = await Inventory.find({ user: req.user._id });
  const ApiFeature = new ApiFeatures(
    Inventory.find({ user: req.user._id }),
    req.query
  ).search();
  const inventories = await ApiFeature.query;
  res.status(200).json({ success: true, inventories });
});

// Get Single Inventory Details
exports.getInventoryDetails = catchAsyncErrors(async (req, res, next) => {
  const inventory = await Inventory.findById(req.params.id);

  if (!inventory) {
    return next(new ErrorHandler("Inventory not found", 404));
  }

  res.status(200).json({
    success: true,
    inventory,
  });
});

exports.decrementQuantity = catchAsyncErrors(async (id, quantity) => {
  const inventory = await Inventory.findById(id);
  const newQty = inventory.quantity - quantity;
  if (newQty < 0) {
    throw new ErrorHandler("Cannot purchase more than existing quantity", 400);
  }
  inventory.quantity -= quantity ?? 1;
  await inventory.save();
});

//
exports.incrementQuantity = catchAsyncErrors(async (id, quantity) => {
  const inventory = await Inventory.findById(id);
  inventory.quantity += quantity ?? 1;
  await inventory.save();
});

// Update Inventory
exports.updateInventory = catchAsyncErrors(async (req, res, next) => {
  let inventory = await Inventory.findById(req.params.id);
  if (!inventory) {
    return next(new ErrorHandler("Inventory not found", 404));
  }
  if (req.files?.image) {
    const result = await upload(req.files.image);
    req.body.image = result.url;
  }
  // if (req.body.barCode !== undefined) {
  //   const existingInventory = await Inventory.findOne({
  //     barCode: req.body.barCode,
  //     user: req.user._id,
  //   });
  //   if (!lodash.isEmpty(existingInventory)) {
  //     return next(
  //       new ErrorHandler("Product with this barcode already exists ", 400)
  //     );
  //   }
  // }
  inventory = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    success: true,
    inventory,
  });
});

// Delete Inventory
exports.deleteInventory = catchAsyncErrors(async (req, res, next) => {
  const inventory = await Inventory.findById(req.params.id);

  if (!inventory) {
    return next(new ErrorHandler("Inventory not found", 404));
  }
  await inventory.remove();
  res.status(200).json({
    success: true,
    message: "Inventory Delete Successfully",
  });
});
