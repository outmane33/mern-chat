const express = require("express");

const {
  updateProfile,
  getUsersForSidebar,
} = require("../services/userService");
const { protect } = require("../services/authService");
const router = express.Router();

router.route("/update-profile").put(protect, updateProfile);
router.route("/").get(protect, getUsersForSidebar);

module.exports = router;
