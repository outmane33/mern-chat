const expressAsyncHandler = require("express-async-handler");

const User = require("../models/userModel");
const { sanitizeUser } = require("../utils/sanitizeData");
const cloudinary = require("../utils/coudinary.js");

exports.updateProfile = expressAsyncHandler(async (req, res, next) => {
  const uploadResonse = await cloudinary.uploader.upload(req.body.profilePic);
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      profilePic: uploadResonse.secure_url,
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    user: sanitizeUser(updatedUser),
  });
});

exports.getUsersForSidebar = expressAsyncHandler(async (req, res, next) => {
  const users = await User.find({ _id: { $ne: req.user._id } });
  res.status(200).json({
    status: "success",
    users: users.map((user) => sanitizeUser(user)),
  });
});
