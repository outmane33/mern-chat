const expressAsyncHandler = require("express-async-handler");

const Message = require("../models/messageModel");
const cloudinary = require("../utils/coudinary.js");
const { getReceiverSocketId, io } = require("../utils/socket.js");

exports.getMessages = expressAsyncHandler(async (req, res, next) => {
  const messages = await Message.find({
    $or: [
      { senderId: req.user._id, receiverId: req.params.id },
      { senderId: req.params.id, receiverId: req.user._id },
    ],
  });
  res.status(200).json({
    status: "success",
    messages,
  });
});

exports.sendMessage = expressAsyncHandler(async (req, res, next) => {
  const { text, image } = req.body;
  let imageUrl;
  if (image) {
    //upload base64 image to cloudinary
    const uploadResonse = await cloudinary.uploader.upload(image);
    imageUrl = uploadResonse.secure_url;
  }
  const message = await Message.create({
    senderId: req.user._id,
    receiverId: req.params.id,
    text,
    image: imageUrl,
  });

  //realtime functionality
  const receiverSocketId = getReceiverSocketId(req.params.id);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", message);
  }

  res.status(200).json({
    status: "success",
    message,
  });
});
