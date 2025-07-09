const { Router } = require("express");
const { authenticate } = require("../middleware/Auth");
const { getAllUsers } = require("../controllers/User");
const router = Router();

router.get("/users", authenticate, getAllUsers); // protected route
module.exports = router;