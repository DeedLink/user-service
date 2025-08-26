const express = require("express");
const { registerUser, getUserProfile } = require("../controllers/userController");
const router = express.Router();

router.post("/register", registerUser);
router.get("/:wallet", getUserProfile);

module.exports = router;
