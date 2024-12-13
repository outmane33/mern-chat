const express = require("express");
const { getMessages, sendMessage } = require("../services/messageService");
const { protect } = require("../services/authService");
const router = express.Router();

router.route("/:id").get(protect, getMessages);
router.route("/send/:id").post(protect, sendMessage);

module.exports = router;
