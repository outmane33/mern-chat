const express = require("express");
const {
  signUp,
  signIn,
  signOut,
  checkAuth,
  protect,
} = require("../services/authService");

const router = express.Router();

router.route("/signup").post(signUp);
router.route("/signin").post(signIn);
router.route("/signout").get(signOut);
router.route("/check").get(protect, checkAuth);

module.exports = router;
