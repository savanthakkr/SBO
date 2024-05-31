const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const { QueryTypes } = require('sequelize');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { sequelize, testConnection } = require('./config/database');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const http = require('http');
const { socket: socketFunction } = require('./controllers/soketController');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const { googleLogin } = require('./controllers/userController');

// Passport configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
 callbackURL: "http://localhost:5000/api/auth/google/callback"
}, (accessToken, refreshToken, profile, cb) => {
  // User has authenticated, return the user profile
  return cb(null, profile._json);
}));

passport.serializeUser((user, next)=>{
  return next(null, user)
})

passport.deserializeUser((user, next)=>{
  return next(null, user)
})

// Session configuration
const sessionConfig = {
  secret: 'secret',
  resave: false,
  saveUninitialized: true
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors());
app.use(fileUpload());
app.use('/public', express.static(path.join(__dirname, './public/')));
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Test the database connection
testConnection()
  .then(() => {
    // Routes
    app.use('/api', userRoutes);
    
    app.get('/api/auth/google', passport.authenticate('google', {
      scope: ['profile', 'email']
    }));
    
    app.get('/api/auth/google/callback', passport.authenticate('google', {
      failureRedirect: '/login',
    }), googleLogin);

    const server = http.createServer(app);
    socketFunction(server);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to start server:', err);
  });