const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const modelUSER = require("../models/index").USER;

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: "devJWT",
};
module.exports = (passport) => {
  passport.use(
    new JwtStrategy(options, async (payload, done) => {
      console.log(payload);
      try {
        const user = await modelUSER.findById(payload.userId);
        // console.log(user);
        if (user) {
          done(null, user);
        } else {
          done(null, false);
        }
      } catch (error) {
        console.log("Error");
      }
    })
  );
};
