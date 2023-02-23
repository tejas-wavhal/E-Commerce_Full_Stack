const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const User = require("../models/userModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const cloudinary = require("cloudinary");
const getDataUri = require("../utils/dataUri.js")

// Register a User
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body
  const file = req.file


  if (!name || !email || !password || !file) return next(new ErrorHandler("Please Enter all feild", 400))

  let user = await User.findOne({ email })

  if (user) return next(new ErrorHandler("User already exists", 409))

  const fileUri = getDataUri(file)
  const mycloud = await cloudinary.v2.uploader.upload(fileUri.content) //Upload on Cloudinary

  user = await User.create({  //this is done when user doesn't already exists to create new user 
    name,
    email,
    password,
    avatar: {
      public_id: mycloud.public_id,
      url: mycloud.secure_url,
    }
  })

  sendToken(user, 201, res, 'Registerd Successfully');
});

// Login User
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  // checking if user has given password and email both

  if (!email || !password) {
    return next(new ErrorHandler("Please Enter Email & Password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  sendToken(user, 200, res, 'Login Successfull');
});

// Logout User
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged Out Successfull",
  });
});

// Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Get ResetPassword Token
  const resetToken = user.getResetPasswordToken(); //in instance method token will be return and token will hashed and stored that hashed token in that user's document(mongo DB)

  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${req.protocol}://${req.get(
    "host"
  )}/password/reset/${resetToken}`;

  const message = `Click on the link below to reset your password:- \n\n ${resetPasswordUrl} \n\nIf you have not requested then, please ignore it.`;

  try {
    await sendEmail({
      email: user.email,
      subject: `Shopie Password Recovery`,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(error.message, 500));
  }
});

// Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params

  // creating token hash
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandler(
        "Reset Password Token is invalid or has been expired",
        400
      )
    );
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password Changed Successfully",
  })
});


// Get User Detail / get my profile
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

// update User password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body

  if (!oldPassword || !newPassword) return next(new ErrorHandler("Please Enter all feild", 400))

  const user = await User.findById(req.user._id).select("+password")

  const isMatch = await user.comparePassword(oldPassword)   //checks that user is there or not & returns true of false

  if (!isMatch) return next(new ErrorHandler("Incorrect Old Password", 400))

  //else
  user.password = newPassword; //password modified

  await user.save();  //don't need to hash pass again and again cause we have said in User Modal that whenever pass isModified then hash

  res.status(200).json({
    success: true,
    message: "Password Changed Successfully"
  })
});

// update User Profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, email } = req.body

  if (!name && !email) return next(new ErrorHandler("Atleast enter one field", 400))

  const user = await User.findById(req.user._id)

  if (name) user.name = name
  if (email) user.email = email

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile Updated Successfully"
  })
});

//update profile picture
exports.updateProfilePicture = catchAsyncErrors(async (req, res, next) => {
  const file = req.file
  const user = await User.findById(req.user._id)

  const fileUri = getDataUri(file)
  const mycloud = await cloudinary.v2.uploader.upload(fileUri.content) //Upload on Cloudinary

  await cloudinary.v2.uploader.destroy(user.avatar.public_id)

  user.avatar = {
    public_id: mycloud.public_id,
    url: mycloud.secure_url,
  }

  await user.save()

  res.status(200).json({
    success: true,
    message: "Profile Picture Updated Successfully"
  })
})


// Get all users(admin)
exports.getAllUser = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

// Get single user (admin)
exports.getSingleUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorHandler(`User does not exist with Id: ${req.params.id}`)
    );
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// update User Role -- Admin
exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  if (!user) {
    return next(
      new ErrorHandler(`User does not exist with Id: ${req.params.id}`, 400)
    );
  }

  res.status(200).json({
    success: true,
  });
});

// Delete User --Admin
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorHandler(`User does not exist with Id: ${req.params.id}`, 400)
    );
  }

  // const imageId = user.avatar.public_id;

  // await cloudinary.v2.uploader.destroy(imageId);

  await user.remove();

  res.status(200).json({
    success: true,
    message: "User Deleted Successfully",
  });
});
