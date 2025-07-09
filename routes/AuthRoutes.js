const { Router } = require("express");
const { SignUp, ResendOtp, SendOtp, RefreshToken, SignIn, Logout, ValidateUserName, UpdateProfile } = require("../controllers/Auth");
const upload = require("../middleware/multer");
const { authenticate } = require("../middleware/Auth");
const router = Router();

router.post('/register',SignUp)
router.post('/login',SignIn)
router.post('/logout',Logout)
router.post('/send-otp', SendOtp);
router.post('/resend-otp', ResendOtp);
router.post('/refresh-token', RefreshToken);
router.post('/validate-username', ValidateUserName);
router.put('/update-profilepicture',authenticate,upload.single('image'), UpdateProfile);
module.exports = router;