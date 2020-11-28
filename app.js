const express = require("express");
const PORT = process.env.PORT || 3000;
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path");
const { mongoURL } = require("./server/config");
const routesAPI = require("./server/routes");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
app.use(express.static(path.join(__dirname, "dist")));
app.use(passport.initialize());
require("./server/middleware/passport")(passport);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/server/uploads", express.static("server/uploads"));
app.use(cors());
app.use("/api", routesAPI);
// app.get("*", (req, res) => {
//   res.send(path.resolve(path.join("dist", "index.html")));
// });
async function start() {
  try {
    await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
    app.listen(PORT, () => {
      // console.log(routesAPI);
      console.log("server has been started on port and db connected " + PORT);
    });
  } catch (e) {
    console.log("ERROOOOOORRRRR");
  }
}
start();
