import { Schema, model } from "mongoose";
import validator from "validator";

const subscribedUserSchema = new Schema({
  email: {
    type: String,
    required: [true, "Please Enter Your Email"],
    unique: true,
    validate: [validator.isEmail, "Please Enter a valid Email"],
    trim: true,
  },
  phoneNumber: {
    type: Number,
    required: [true, "Please enter your phone Number"],
    maxlength: [10, "Phone number cannot exceed more than 10"],
    trim: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expireAt: {
    type: Date,
    default: Date.now() + 1000 * 60 * 60 * 24 * 28,
  },
});

export const SubscribedUser = model("SubscribedUser", subscribedUserSchema);
