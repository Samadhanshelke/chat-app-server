const multer = require('multer');
const storage = multer.memoryStorage(); // Keep file in memory for Cloudinary upload
const upload = multer({ storage });

module.exports = upload;
