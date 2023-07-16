const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const User = require("../models/userModel");
const Order =require('../models/orderedItem')
const Inventory=require("../models/inventoryModel")
const jwt = require("jsonwebtoken");
const sendToken = require("../utils/jwtToken");
const sendTokenlogin =require("../utils/jwtToken")
const fast2sms = require("fast-two-sms");
const otpGenerator = require("otp-generator");
const otpModel = require("../models/otpModel");
const bcrypt = require("bcryptjs");
const subscribedUsersModel = require("../models/subscribedUsersModel");
const upload = require("../services/upload");
// const sendEmail = require("../utils/sendEmail");
// const crypto = require("crypto");
// const cloudinary = require("cloudinary");
const { uploadImage } =require("../services/upload")

exports.verifyOtp = catchAsyncErrors(async (req, res, next) => {
  const otpHolder = await otpModel.find({
    phoneNumber: req.body.number,
  });

  console.log("OtpHolder", otpHolder);

  if (otpHolder.length === 0) {
    return res.status(400).send("You are using an expired OTP");
  }

  const rightOtpFind = otpHolder[otpHolder.length - 1];

  console.log("right otp", rightOtpFind);
  const validUser = await bcrypt.compare(req.body.otp, rightOtpFind.otp);

  console.log("user ", validUser);

  if (rightOtpFind.phoneNumber === req.body.number && validUser) {
    const user = await User.findOne({ phoneNumber: req.body.number });

    // console.log(user);
    // const user = new User(_.pick(req.body, ["phoneNumber"]));
    console.log(user);
    // sendToken(user, 201, res);
    const token = sendToken(user, 201, res);

    console.log(token);

    const result = await user.save();
    const OTPDelete = await otpModel.deleteMany({
      phoneNumber: rightOtpFind.phoneNumber,
    });

    return res.status(200).send({
      message: "User Registration Successful",
      token: token,
      data: result,
    });
  } else {
    return res.status(400).send("Your otp was wrong");
  }
});

exports.signUpWithPhoneNumber = catchAsyncErrors(async (req, res, next) => {
  const userOtp = await User.findOne({
    phoneNumber: req.body.number,
  });

  if (userOtp) {
    res.status(400).json({
      success: true,
      message: "User already registered",
    });
  }

  const OTP = otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const phoneNumber = req.body.number;

  console.log(OTP);

  // const otp={
  //   phoneNumber:phoneNumber,
  //   otp:OTP
  // }

  const salt = await bcrypt.genSalt(10);

  let otp = await bcrypt.hash(OTP, salt);

  const Otp = await otpModel.create({
    phoneNumber: phoneNumber,
    otp: otp,
  });

  const { email, password, businessName, businessType, address } = req.body;
  const data = await User.findOne({ phoneNumber: phoneNumber });
  if (data) {
    return next(
      new ErrorHandler("Phone Number already registered , Sign In instead", 400)
    );
  }
  const user = await User.create({
    email,
    password,
    businessName,
    businessType,
    address,
    phoneNumber,
  });

  // const result=await otp.save();

  res.status(200).json({
    success: true,
    message: "Otp send successfully",
    Otp,
    user,
  });
  // return res.status(200).json("Otp send successfully",Otp);
});



exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  // Check if GstIN already exists
  if (req.body.GstIN) {
    const existingUser = await User.findOne({ GstIN: req.body.GstIN });
    if (existingUser) {
      return next(new ErrorHandler("GstIN already exists", 400));
    }
  }

  if (req.files?.image) {
    const result = await uploadImage(req.files.image);
    req.body.image = result.url;
    console.log(req.body.image);
  }

  const { locality, city, state } = req.body; // Extracting address subfields
  console.log(city);
  const trimmedCity = city.trim()
  const lowercaseLocality = locality.toLowerCase();
  const lowercaseCity = trimmedCity.toLowerCase();
  const lowercaseState = state.toLowerCase();

  const data = await User.findOne({ phoneNumber: req.body.phoneNumber });
  if (data) {
    return next(
      new ErrorHandler(
        "Phone Number already registered, Sign In instead",
        400
      )
    );
  }

  const userData = {
    ...req.body,
    address: {
      locality: lowercaseLocality,
      city: lowercaseCity,
      state: lowercaseState,
      country: "India", // Assuming the country is always India
    },
  };

  // Remove GstIN field if it is empty
  if (!req.body.GstIN) {
    delete userData.GstIN;
    console.log('removed');
  }

  const user = await User.create(userData);

  return res.render("signedupsuccess");
});





// register user
exports.registerUser123 = catchAsyncErrors(async (req, res, next) => {

  if (!req.body.GstIN) {
    console.log('jhhh');
  }


  if (req.files?.image) {
  
    const result = await uploadImage(req.files.image);
    req.body.image = result.url;
    console.log(req.body.image);
  }
  
  const { locality, city, state } = req.body // Extracting address subfields

  const lowercaseLocality = locality.toLowerCase();
  const lowercaseCity = city.toLowerCase();
  const lowercaseState = state.toLowerCase();

  // console.log(city);
  
  const data = await User.findOne({ phoneNumber: req.body.phoneNumber });
  if (data) {
    return next(
      new ErrorHandler("Phone Number already registered, Sign In instead", 400)
    );
  }

  const user = await User.create({ 
    ...req.body,
    address: {
      locality: lowercaseLocality,
      city: lowercaseCity,
      state: lowercaseState,
      country: "India" // Assuming the country is always India
    }
  });
  
  
  // sendToken(user, 201, res);
  return res.render('signedupsuccess')
});


exports.registerUser0 = catchAsyncErrors(async (req, res, next) => {
  console.log("inside ");
  if (req.files?.image) {
    const result = await upload(req.files.image);
    req.body.image = result.url;
  }
  const data = await User.findOne({ phoneNumber: req.body.phoneNumber });
  if (data) {
    return next(
      new ErrorHandler("Phone Number already registered , Sign In instead", 400)
    );
  }

  const user = await User.create({ ...req.body });
  const subbed = await subscribedUsersModel.create({
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
  });

  sendToken(user, 201, res);
});


// Login user
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  
  if (!email || !password) {
    return next(new ErrorHandler("Please enter email and password", 400));
  }
  
  const user = await User.findOne({ email }).select("+password");
  
  if (!user) {
    console.log("wrong password");
    return next(new ErrorHandler("Invalid email or password", 400));
  }

  const isPasswordMatched = await user.comparePassword(password);

  if(isPasswordMatched){
    console.log("correct");
  }

  if (!isPasswordMatched) {
    console.log("wrong password");
    return next(new ErrorHandler("Invalid email or password", 400));
  }

  sendToken(user, 200, res);
});

// logout user
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged Out",
  });
});

// Get User Detail
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Old password is incorrect", 400));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("password does not match", 400));
  }

  user.password = req.body.newPassword;

  await user.save();

  sendToken(user, 200, res);
});

exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

exports.getAllUser = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

// update User Role -- Admin
// exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {
//   const newUserData = {
//     name: req.body.name,
//     email: req.body.email,
//     role: req.body.role,
//   };

//   await User.findByIdAndUpdate(req.params.id, newUserData, {
//     new: true,
//     runValidators: true,
//     useFindAndModify: false,
//   });

//   res.status(200).json({
//     success: true,
//   });
// });

exports.sendOtp = catchAsyncErrors(async (req, res, next) => {
  const response = await fast2sms.sendMessage({
    authorization: process.env.FAST_TWO_SMS,
    message: req.body.message,
    numbers: [req.body.number],
  });

  res.status(200).json({
    success: true,
    response,
  });
});

exports.refreshJwtToken = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to access this resource", 401));
  }
  const data = jwt.decode(token);
  const user = await User.findById(data.id);
  sendToken(user, 200, res);
});

exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { newPassword, confirmPassword, phoneNumber } = req.body;
  if (newPassword !== confirmPassword) {
    return next(new ErrorHandler("password does not match", 400));
  }
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    return next(new ErrorHandler("User not found", 400));
  }
  user.password = newPassword;
  await user.save();
  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});


// GetUser UPi

exports.getUpi = catchAsyncErrors(async (req, res, next) => {

  const user = await User.findById(req.user.id);
  const upi = user.upi_id
  res.status(200).json({
    success: true,
    upi,
  });

})
// Update user UPI

exports.updateUpi = catchAsyncErrors(async (req, res, next) => {

  const { upi_id } = req.body;

  // Find the user by their ID
  const user = await User.findById(req.user.id);

  // If user is not found, return an error
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  user.upi_id = upi_id;
  await user.save();

  // Return a success response
  res.status(200).json({
    success: true,
    message: 'UPI ID updated successfully',
    upi: upi_id
  });


})

const multer = require("multer");



exports.uploadData=catchAsyncErrors(async(req,res,next)=>{
  if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
    
      const filePath = req.file.path;
      const userDetail = req.user._id;
    
      // Convert the data according to their index number
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
    
      // Convert into JSON format
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
      // Remove the header row
      const headers = jsonData.shift();
    
      try {
        for (const row of jsonData) {
          const itemData = {};
          headers.forEach((header, index) => {
            const value = row[index] !== '' ? row[index] : undefined;
            itemData[header] = value;
          });
    
          itemData.user = userDetail;
    
          // Check if barcode is unique to that particular user
          if (itemData.barcode) {
            const existingInventory = await Inventory.findOne({
              barcode: itemData.barcode,
              user: userDetail,
            });
            if (existingInventory) {
              console.error('Product with this barcode already exists');
              continue;
            }
          }
    
          // Create and save the inventory item
          const inventory = new Inventory(itemData);
          await inventory.save();
          console.log('Item saved:', inventory);
        }
    
        fs.unlinkSync(filePath);
    
        // Success message
        res.json({ message: 'File uploaded successfully' });
      } catch (error) {
        console.error('Failed to save items:', error);
        res.status(500).json({ message: 'Failed to save items' });
      }
})


exports.renderRegister=catchAsyncErrors(async(req,res,next)=>{

  return res.render('register')

})

exports.renderWebLogin=catchAsyncErrors(async(req,res,next)=>{
  
  return res.render('weblogin')

})


exports.webLogin=catchAsyncErrors(async(req,res,nex)=>{
  console.log("oooo");
 
    const { email, password } = req.body;
  
    
    if (!email || !password) {
      return next(new ErrorHandler("Please enter email and password", 400));
    }
    
    const user = await User.findOne({ email }).select("+password");
    
    if (!user) {
      console.log("wrong password");
      return next(new ErrorHandler("Invalid email or password", 400));
    }
  
    const isPasswordMatched = await user.comparePassword(password);
  
    if(isPasswordMatched){
      console.log("correct");
    }
  
    if (!isPasswordMatched) {
      console.log("wrong password");
      return next(new ErrorHandler("Invalid email or password", 400));
    }
  
    console.log(user);
    // sendTokenlogin(user, 200, res)
    // return res.redirect('/api/v1/renderbnulk')
    const responseData = {
      success: true,
      user: req.user,
      token: req.cookies.token,
    };
    return res.render('bulkupload', { data: responseData });
})

exports.renderBulkupload=catchAsyncErrors(async(req,res,next)=>{
  console.log(req.user);
  return res.render('bulkupload')

})



exports.orderStatus=catchAsyncErrors(async(req,res,next)=>{
const userId=req.user._id
console.log(userId);

const orders = await Order.find({
  "items": {
    $elemMatch: {
      sellerId: userId
    }
  }
});

res.send(orders)
})


exports.itemDeatils=catchAsyncErrors(async(req,res,nex)=>{
  try{
    const productId  = req.params.productId
    const userId=req.user._id


    const order = await Order.findOne({
      "items.productId": productId ,
      "items.sellerId": userId
    })

    if(!order){
      return res.status(404).json({
        success: false,
        error:"Order not found"
      })
    }

    const orderItem = order.items.find((item) => item.productId.toString() === productId);
    if (!orderItem) {
      return res.status(404).json({ error: "Order item not found" });
    }
    
    res.send(orderItem);

    // res.send(orders)


  }catch(err){
    console.log(err);
  }
})



exports.acceptOrder=catchAsyncErrors(async(req,res,nex)=>{
  try{
    const productId  = req.params.productId
    const userId=req.user._id

    // console.log(userId);
    console.log(productId);

    const order = await Order.findOne({
      "items.productId": productId ,
      "items.sellerId": userId
    })

    if(!order){
      return res.status(404).json({
        success: false,
        error:"Order not found"
      })
    }

    const orderItem = order.items.find((item) => item.productId.toString() === productId);

    
    if (!orderItem) {
      return res.status(404).json({ error: "Order item not found" });
      
    }

    
    orderItem.status = 'confirmed'
    const inventory = await Inventory.findById(productId)
    if (inventory) {
      console.log(inventory.quantity);
      if (inventory.quantity !== null && orderItem.quantity > inventory.quantity) {
          return res.send({
              success: false,
              error: 'quantity not available'
          });
      }
      if (inventory.quantity !== null) {
          inventory.quantity -= orderItem.quantity;
          await inventory.save();
      }
  }
  
  await order.save();
  
    
    res.send(orderItem);

    // res.send(orders)


  }catch(err){
    console.log(err);
  }
})

exports.acceptAll=catchAsyncErrors(async(req,res,next)=>{
  const {orderId}=req.params

  const order = await Order.findById(orderId)

  order.items.forEach(item =>{
    item.status = 'confirmed'
  })

  await order.save();

  res.status(200).json({
    success: true,
    message: "Status of all products changed to confirmed"
  });
})

exports.rejectAll=catchAsyncErrors(async(req,res,next)=>{
  const {orderId}=req.params

  const order = await Order.findById(orderId)

  order.items.forEach(item =>{
    item.status = 'rejected'
  })

  await order.save();

  res.status(200).json({
    success: true,
    message: "Status of all products changed to confirmed"
  });
})




// change order status

exports.rejectStatus=catchAsyncErrors(async(req,res,nex)=>{
  try{
    const productId  = req.params.productId
    const userId=req.user._id
    console.log(userId);
    
    
    const order = await Order.findOne({
      "items.productId": productId ,
      "items.sellerId": userId
    })

    if(!order){
      return res.status(404).json({
        success: false,
        error:"Order not found"
      })
    }

    const orderItem = order.items.find((item) => item.productId.toString() === productId);
    if (!orderItem) {
      return res.status(404).json({ error: "Order item not found" });
      
    }

    
    orderItem.status = 'rejected'
    const inventory = await Inventory.findById(productId)
    // if (inventory) {
    //   console.log(inventory.quantity);
    //   inventory.quantity -= orderItem.quantity;
    //   await inventory.save();
    // }

    await order.save()
    
    res.send(orderItem);

    // res.send(orders)


  }catch(err){
    console.log(err);
  }
})