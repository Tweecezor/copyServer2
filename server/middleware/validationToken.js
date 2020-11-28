const jwtDecode = require("jwt-decode");

function tokenValidation(req, res, next) {
  console.log("asfewgr");
  console.log(req.headers.authorization);
  let decoded = jwtDecode(req.headers.authorization);
  console.log(decoded.exp * 1000);
  console.log(Date.now());
  console.log(decoded.exp * 1000 < Date.now());
  // console.log(decoded.exp * 1000);
  // console.log(Date.now());
  // 1591187656 = 1591271660922;
  if (decoded.exp * 1000 < Date.now()) {
    res.status(400).json({
      message: "token просрочен",
    });
  } else {
    next();
  }
}

module.exports = tokenValidation;
