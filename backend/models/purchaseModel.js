const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  orderItems: [
    {
      name: {
        type: String,
        // required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      image: {
        type: String,
        // required: true,
      },
      product: {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
        required: true,
      },
    },
  ],
  modeOfPayment: {
    type: String,
    required: true,
  },
  party: {
    type: mongoose.Schema.ObjectId,
    ref: "Party",
    required: false,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PurchaseModel", purchaseSchema);
