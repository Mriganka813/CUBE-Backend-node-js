const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Party = require("../models/partyModel");
// const sendToken = require("../utils/jwtToken");

// create new party
exports.registerParty = catchAsyncErrors(async (req, res, next) => {
  const { name, address, phoneNumber } = req.body;

  const party = await Party.create({
    name,
    address,
    phoneNumber,
    user: req.user._id,
  });

  res.status(201).json({
    success: true,
    party,
  });
});

exports.searchParty = catchAsyncErrors(async (req, res, next) => {
  const { searchQuery, limit } = req.query;
  const user = req.user._id;
  const allParty = await Party.find({
    name: {
      $regex: searchQuery,
      $options: "i",
    },
    user: user,
  }).limit(limit);
  res.status(200).json({
    success: true,
    allParty,
  });
});

exports.getAllParty = catchAsyncErrors(async (req, res, next) => {
  const allParty = await Party.find();
  res.status(200).json({
    success: true,
    allParty,
  });
});

exports.getMyParties = catchAsyncErrors(async (req, res, next) => {
  const allParty = await Party.find({ user: req.user._id });
  res.status(200).json({
    success: true,
    allParty,
  });
});

exports.getSingleParty = catchAsyncErrors(async (req, res, next) => {
  const party = await Party.findById(req.params.id);

  if (!party) {
    return next(new ErrorHandler("party not found", 404));
  }

  res.status(200).json({
    success: true,
    party,
  });
});

exports.updateParty = catchAsyncErrors(async (req, res, next) => {
  let party = await Party.findById(req.params.id);

  if (!party) {
    return next(new ErrorHandler("party not found", 404));
  }

  party = await Party.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    party,
  });
});

exports.deleteParty = catchAsyncErrors(async (req, res, next) => {
  const party = await Party.findById(req.params.id);

  if (!party) {
    return next(new ErrorHandler("party not found", 404));
  }

  await party.remove();

  res.status(200).json({
    success: true,
    message: "party Deleted Successfully",
  });
});

/**
 * Get party credit orders
 */

/**
 * Get the sum of all the party's total credit amount
 * Returns only parties whose amounts are greater than zero
 */
exports.getCreditSaleParties = catchAsyncErrors(async (req, res, next) => {
  const user = req.user._id;
  const data = await Party.aggregate([
    {
      $match: { user: user },
    },
    {
      $lookup: {
        from: "salesmodels",
        localField: "_id",
        foreignField: "party",
        as: "sale",
      },
    },
    {
      $addFields: {
        totalCreditAmount: { $sum: "$sale.total" },
      },
    },
    {
      $unset: ["sale"],
    },
  ]);
  if (!data) {
    return next(new ErrorHandler("Orders not found", 404));
  }
  res.status(200).json({
    success: true,
    data,
  });
});
exports.getCreditPurchaseParties = catchAsyncErrors(async (req, res, next) => {
  const user = req.user._id;
  const data = await Party.aggregate([
    {
      $match: { user: user },
    },
    {
      $lookup: {
        from: "purchasemodels",
        localField: "_id",
        foreignField: "party",
        as: "purchase",
      },
    },
    {
      $addFields: {
        totalCreditAmount: { $sum: "$purchase.total" },
      },
    },
    {
      $unset: ["purchase"],
    },
  ]);
  if (!data) {
    return next(new ErrorHandler("Orders not found", 404));
  }
  res.status(200).json({
    success: true,
    data,
  });
});
