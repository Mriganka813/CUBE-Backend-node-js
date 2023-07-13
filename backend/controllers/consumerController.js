const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Consumer = require("../models/consumerModel");
const OrderedItem= require("../models/orderedItem")
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/userModel");
const Inventory = require("../models/inventoryModel");
const ApiFeatures = require("../utils/apiFeatures");
const Product = require('../models/inventoryModel');
const { unsubscribe } = require("../routes/consumerRoute");

// variable for global clicks counter
let allClicksProducts = 0;
let allClicksSeller = 0;
// registering consumer
exports.registerConsumer = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, phoneNumber } = req.body;
  if (!name || !email || !password || !phoneNumber) {
    return next(new ErrorHandler("Please provide all the details", 400));
  }
  const consumer = await Consumer.create({
    name,
    email,
    password,
    phoneNumber,
  });
  const token = consumer.getJWTToken();
  sendToken(consumer, 201, res);
});

// consumer login
exports.loginConsumer = catchAsyncErrors(async (req, res, next) => {
  // console.log('hi');
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Please provide all the details", 400));
  }
  const consumer = await Consumer.findOne({ email }).select("+password");
  if (!consumer) {
    return next(new ErrorHandler("Invalid credentials", 400));
  }
  const isMatch = await consumer.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid credentials", 400));
  }
  sendToken(consumer, 200, res);
});

// consumer logout
exports.consumerLogout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged Out",
  });
});

// get contact number of seller
exports.getContactNumber = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  res.status(200).json({
    success: true,
    data: user.phoneNumber,
  });
});

// get sellers and search according to location
exports.getSellersAndSearch = catchAsyncErrors(async (req, res, next) => {
  // const { city, state, country } = req.body;

  const apiFeature = new ApiFeatures(
    User.find({
      address: {
        $regex: req.query.keyword,
        $options: "i",
      },
    }).sort("-createdAt"),
    req.query
  ).pagination(50);
  const sellers = await apiFeature.query;
  if (!sellers) {
    return next(new ErrorHandler("No sellers found", 404));
  }
  res.status(200).json({
    success: true,
    data: sellers,
  });
});

// get all sellers from inventory where category is matched
exports.getSellers = catchAsyncErrors(async (req, res, next) => {
  const { category } = req.query;
  if (!category) {
    return next(new ErrorHandler("Please provide category", 400));
  }

  const apiFeature = new ApiFeatures(
    User.find({
      businessType: {
        $regex: category,
        $options: "i",
      },
    }),
    req.query
  ).pagination(10);
  const sellers = await apiFeature.query;
  if (!sellers) {
    return next(new ErrorHandler("No sellers found", 404));
  }
  res.status(200).json({
    success: true,
    data: sellers,
  });
});

// get all products from a user
exports.getProductsOfUser = catchAsyncErrors(async (req, res, next) => {
  const id = req.params.id;
  if (!id) {
    return next(new ErrorHandler("Please provide id as query param", 400));
  }
  const seller = await User.findById(id);
  if (!seller) {
    return next(new ErrorHandler("User not found", 404));
  }
  const apiFeature = new ApiFeatures(
    Inventory.find({
      user: id,
    }),
    req.query
  ).pagination(10);
  const products = await apiFeature.query;
  if (!products) {
    return next(new ErrorHandler("No products found", 404));
  }
  res.status(200).json({
    success: true,
    data: products,
  });
});

// get all sellers and search by name :
exports.getSellersByName = catchAsyncErrors(async (req, res, next) => {
  const key = req.query.keyword
    ? {
        businessName: {
          $regex: req.query.keyword,
          $options: "i",
        },
      }
    : {};
  const apiFeature = new ApiFeatures(User.find(key), req.query).pagination(10);
  const sellers = await apiFeature.query;
  res.status(200).json({
    success: true,
    sellers,
  });
});

// get all names of products
exports.getProductNamesandSearch = catchAsyncErrors(async (req, res, next) => {
  const key = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: "i",
        },
      }
    : {};
  const products = await Inventory.find(key).select("name");
  res.status(200).json({
    success: true,
    products,
  });
});

// tracker
exports.addClickProduct = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const product = await Inventory.findById(id);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  product.clicks = product.clicks + 1;
  allClicksProducts = allClicksProducts + 1;
  await product.save();
  const updProduct = await Inventory.findById(id);
  res.status(200).json({
    success: true,
    message: "Click added",
    data: updProduct,
  });
});

// clicks for sellers
exports.addClickSeller = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const seller = await User.findById(id);
  if (!seller) {
    return next(new ErrorHandler("Seller not found", 404));
  }
  seller.clicks = seller.clicks + 1;
  allClicksSeller = allClicksSeller + 1;
  await seller.save();
  const updSeller = await User.findById(id);
  res.status(200).json({
    success: true,
    message: "Click added",
    data: updSeller,
  });
});

// get top clicked products of specific seller
exports.getTopClickedProducts = catchAsyncErrors(async (req, res, next) => {
  const { page = 1 } = req.query;
  const limit = 10;
  let popularProducts = [];
  // check if req.query.keyword is present
  if (!req.query.keyword) {
    return next(new ErrorHandler("Please provide keyword", 400));
  }
  const seller = await User.find({
    address: {
      $regex: req.query.keyword,
      $options: "i",
    },
  });
  if (!seller) {
    return next(new ErrorHandler("Sellers not found", 404));
  }
  for (let i = 0; i < seller.length; i++) {
    const product = await Inventory.find({
      user: seller[i]._id,
    })
      .sort("-clicks")
      .limit(1)
      .populate("user")
      .limit(limit)
      .skip((page - 1) * limit);
    if (product.length > 0) {
      popularProducts.push(product[0]);
    }
  }
  res.status(200).json({
    success: true,
    popularProducts,
  });
});

// get top clicked sellers
exports.getTopClickedSellers = catchAsyncErrors(async (req, res, next) => {
  const sellers = await User.find().sort("-clicks");
  res.status(200).json({
    success: true,
    sellers,
  });
});

// get consumer details from id
exports.getConsumerDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const consumer = await Consumer.findById(id);
  if (!consumer) {
    return next(new ErrorHandler("Consumer not found", 404));
  }
  res.status(200).json({
    success: true,
    consumer,
  });
});

// update consumer details
exports.updateConsumerDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const consumer = await Consumer.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!consumer) {
    return next(new ErrorHandler("consumer not found", 404));
  }
  res.status(200).json({
    success: true,
    consumer,
  });
});


// add to cart
exports.addToCart = catchAsyncErrors(async (req, res, next) => {
  console.log("inside cart");
  const userId = req.user._id;
  const productId = req.params.productId;
  const qty = parseInt(req.body.qty);
  // console.log(userId);
  
  const consumer = await Consumer.findById(userId);

  const product = await Inventory.findById(productId)

  console.log(product.quantity);
  if(qty>product.quantity){
    return res.json({
      satus: false,
      msg:"quantity Not available"
    })
  }
  const sellerId=product.user
  

  // console.log(consumer.cart);
  if (!consumer) {
    console.log("User not found");
  }


  consumer.cart = consumer.cart.filter(
    (item) => item.sellerId.toString() === sellerId.toString()
  );

    // Create a new cart item
    const newCartItem = {

      productId: productId,
      quantity: qty,
      sellerId: sellerId
    };
  // Check if the product is already in the cart
  const existingCartItem = consumer.cart.find(
    (item) =>
      item.productId.toString() === productId.toString() &&
      item.sellerId.toString() === sellerId.toString()
  );

  if (existingCartItem) {
    const totalQty = existingCartItem.quantity + qty;

    if (totalQty > product.quantity) {
      return res.json({
        satus: false,
        msg:"quantity Not available"
      })
    }

    // If the product is already in the cart, update the quantity
    existingCartItem.quantity = totalQty;
  } else {
    // If the product is not in the cart, create a new cart item
    const newCartItem = {
      productId: productId,
      quantity: qty,
      sellerId: sellerId,
    };
    consumer.cart.push(newCartItem);
  }

  


  // consumer.cart.push(newCartItem);
  const savedConsumer = await consumer.save();

  return res.json({
    satus: true,
    msg:"Added successfully"
  })
});


exports.removeItem=catchAsyncErrors(async(req,res,next)=>{
  try{

    const userId= req.user._id
    const productId = req.params.productId;
    console.log(productId);
    // find user
    const user = await Consumer.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

         // Find the index of the cart item to be deleted
         const cartItemIndex = user.cart.findIndex(
          (item) => item.productId.toString() === productId
      );

      if (cartItemIndex !== -1) {
        user.cart.splice(cartItemIndex, 1);
        const savedUser = await user.save();

        res.send({
          success:true,
          msg:"deleted",
          
        })
    }

  }catch(err){
    console.log(err);
  }
})

exports.showCart=catchAsyncErrors(async(req,res,next)=>{

  console.log("jii");
  const userId = req.user._id

  const consumer = await Consumer.findById(userId)

  const cartWithProductInfo = await Promise.all(
    consumer.cart.map(async (item) => {
      const product = await Inventory.findById(item.productId);
      return {
        
        product,
        quantity: item.quantity,
        
      };
    })
  );

  res.send(cartWithProductInfo);
})

exports.checloutCart = catchAsyncErrors(async (req, res, next) => {

  const userId=req.user.id
  // send cart data to orderDB
  const user = await User.findById(userId)
  console.log(user.cart );

});


// search Location ** TODO send only nearby shops **
exports.searchLocation = catchAsyncErrors(async (req, res, next) => {
  const searchedLocation = req.body.location;
  const location = searchedLocation.toLowerCase();
  console.log(location);

  try {
    const users = await User.find({
      $or: [
        { "address.city": location },
        { "address.state": location }
      ]
    })
      .limit(20) // Limit the search results to 5
      .exec();

    console.log(users);
    if (users.length === 0) {
      return res.send("Sorry, no sellers found at that location.");
    }

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});


// Vie all

exports.viewAll = catchAsyncErrors(async (req, res, next) => {
  const searchedLocation = req.params.location;
  const location = searchedLocation.toLowerCase();
  console.log(location);

  try {
    const users = await User.find({
      $or: [
        { "address.city": location },
        { "address.state": location }
      ]
    })
      

    console.log(users);
    if (users.length === 0) {
      return res.send("Sorry, no sellers found at that location.");
    }

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});


// Search Product
// Search Product top reults 
exports.searchProduct = catchAsyncErrors(async (req, res, next) => {
  const productName = req.body.productName;







  
  const nameVariations = [];
  const nameWords = productName.split(" ");

  for (let i = 0; i < nameWords.length; i++) {
    const variation = nameWords.slice(0, i + 1).join(" ");
    nameVariations.push(variation);
  }

  try {
    const product = await Product.find({
      $or: nameVariations.map(variation => ({
        $or: [
          { name: { $regex: new RegExp(variation, "i") } },
          { category: { $regex: new RegExp(variation, "i") } }
        ]
      }))
    });

    console.log(product.user);
    if (product.length === 0) {
      return res.send("Sorry, no products found matching your search.");
    }

    
    // const sellerName=await User.findById(product.user);

    // console.log(sellerName.businessName);

    

    res.status(200).json({ product });

  } catch (err) {
    res.send(err);
  }
});

// route for open shop (single)

exports.viewShop=catchAsyncErrors(async(req,res)=>{
    const shopId =req.params.shopId

    const inventory= await Inventory.find({ user: shopId })
    console.log(inventory);
    res.send(inventory)
})

// flter Product by category

exports.filterProduct = catchAsyncErrors(async (req, res, next) => {

  const category=req.params.productCategory
  const location=req.params.location
  const user= await User.find({
    businessType:category,
    $or: [
      { "address.city": location },
      { "address.state": location }
    ]
  
  })

  if(user.length === 0){
    return res.send("Sorry, NO seller Available");
  }
  
  res.send(user)

});

exports.placeOrder = catchAsyncErrors(async (req, res, next) => {
  //  to do can order if cart is empty
  try {
    const userId = req.user._id;
    // const sellerId = req.params.sellerId
    const user = await Consumer.findById(userId).populate('cart.productId');
    console.log(user.cart.length);
    if(user.cart.length==0){
      return res.send({success: false, msg:"Cart is Empty "})
    }
    const orderItems = user.cart.map((item) => {
      return {
        productId: item.productId._id,
        productName: item.productId.name,
        productPrice: item.productId.sellingPrice,
        productImage: item.productId.img,
        quantity: item.quantity,
        barcode: item.productId.barCode,
        sellerId: item.productId.user,
        sellerName: item.productId.sellerName
      };
    });

    const address = {
      // country: req.body.country,
      name: req.body.name,
      state: req.body.state,
      city: req.body.city,
      phoneNumber: req.body.phoneNumber,
      pinCode: req.body.pinCode,
      streetAddress: req.body.streetAddress,
      additionalInfo: req.body.additionalInfo,
      landmark: req.body.landmark,
      latitude: req.body.latitude,
      longitude: req.body.longitude
    };


    // Deduct the quantity of each ordered item from the database
  //  for (const item of user.cart) {
  //   console.log(item.productId);
  //   const inventory = await Inventory.findById(item.productId);
  //   if (inventory) {
  //     console.log(inventory.quantity);
  //     inventory.quantity -= item.quantity;
  //     await inventory.save();
  //   }
  // }
    user.cart = [];
    await user.save();

    const newOrder = new OrderedItem({
      items: orderItems,
      consumer: userId,
      // seller:sellerId,
      addresses: address
    });
    await newOrder.save();

    return res.send({
      success: true,
      msg: "Order placed",
      newOrder
    });

  } catch (err) {
    console.log(err);
  }
});





exports.recentOrders = catchAsyncErrors(async (req, res, next) => {

  try{
    const userId = req.user._id
    const recentOrders = await OrderedItem.find({ userId: userId });

    res.send(recentOrders)
 
 
  }catch(err){
   console.log(err);
  }
 
 });

 
 exports.addAddress = catchAsyncErrors(async (req, res, next) => {

  try{
    const consumerId=req.user._id
    const {
      name,
      state,
      city,
      phoneNumber,
      pinCode,
      streetAddress,
      additionalInfo,
      landmark,
      latitude,
      longitude,
    } = req.body;
    const consumer = await Consumer.findById(consumerId)
    if (!consumer) {
      return res.status(404).json({ message: "Consumer not found" });
    }

    const newAddress = {};

    if (name) newAddress.name = name
    if (state) newAddress.state = state.toLowerCase();
    if (city) newAddress.city = city;
    if (phoneNumber) newAddress.phoneNumber = phoneNumber;
    if (pinCode) newAddress.pinCode = pinCode;
    if (streetAddress) newAddress.streetAddress = streetAddress;
    if (additionalInfo) newAddress.additionalInfo = additionalInfo;
    if (landmark) newAddress.landmark = landmark;
    if (latitude) newAddress.latitude = latitude;
    if (longitude) newAddress.longitude = longitude;

    consumer.addresses.push(newAddress);
    await consumer.save();

    res.status(201).json({ 
      success:true,
      message: "Address added successfully", 
      address: newAddress 
    });
 
 
  }catch(err){
   console.log(err);
  }
 
 });



 
exports.deleteAccountPage = catchAsyncErrors(async (req, res, next) => {

  try{
    return res.render('deletePage')
 
 
  }catch(err){
   console.log(err);
  }
 
 });

  
//  const Consumer = require('../models/Consumer'); // Import the Consumer model

 exports.deleteAccount = catchAsyncErrors(async (req, res, next) => {
   try {
     const { email, password } = req.body;
 
     // Find the consumer by email
     const consumer = await Consumer.findOne({ email });
 
     if (!consumer) {
       return res.status(404).json({ message: 'Consumer not found' });
     }
 
     // Check if the provided password matches the consumer's password
     const isPasswordMatched = await consumer.comparePassword(password);
 
     if (!isPasswordMatched) {
       return res.status(401).json({ message: 'Invalid password' });
     }
 
     // Delete the consumer account
     await Consumer.findByIdAndDelete(consumer._id);
 
     res.status(200).json({ message: 'Account deleted successfully' });
   } catch (err) {
     console.log(err);
     res.status(500).json({ message: 'Internal server error' });
   }
 });
 




 exports.policyPage = catchAsyncErrors(async (req, res, next) => {

  try{
    return res.render('consumerprivacy')
 
 
  }catch(err){
   console.log(err);
  }
 
 });