const multer = require("multer");
const moment = require("moment");
const path = require("path");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    console.log(file);
    console.log();
    cb(null, path.join(__dirname, "/uploads"));
  },
  filename(req, file, cb) {
    // const date = moment("DDMMYYYY-HHmmss_SS");
    cb(null, `${file.originalname}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
module.exports = multer({
  storage,
  fileFilter,
});
