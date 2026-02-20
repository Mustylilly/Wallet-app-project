import pg from "pg";
import bodyParser from "body-parser";
import express from "express";
import session from "express-session";
import passport from "passport";
import env from "dotenv";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth20";
import bcrypt from "bcrypt";



const app = express();
const port = 3000;
env.config();


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();



app.get("/", (req, res) => {
  res.render("../views/index.ejs");
});






passport.use(
  new Strategy ({ usernameField: "email" }, async (email, password, done) => {
    const user = await findUserByEmail(email);
    if (!user) return done(null, false);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return done(null, false);

    return done(null, user);
  })
);
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);


passport.use(
  "google",
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    
  }, async (_, __, profile, done) => {
    const user = await findOrCreateGoogleUser(profile);
    done(null, user);
  })
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await findUserById(id);
  done(null, user);
});






app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
