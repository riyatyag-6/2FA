const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const session = require('express-session');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const path = require('path');
const axios = require('axios'); //
dotenv.config();

const app = express();
//app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// Set up session for handling user login state
app.use(session({
  secret: process.env.SESSION_SECRET || 'e9726aa9492317cf0197b7ace714bf4b615b5d460ed3f1e6fef15e1306ad716357c033ecfafb9458197270f4d1e1d7e6f0f902c386bcc125ffb51db46a2be81a',
  resave: false,
  saveUninitialized: true,
}));

// Middleware to parse URL-encoded and JSON data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/authentication", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log("MongoDB connection error:", err));

// Home route with login and registration buttons
app.get('/', (req, res) => {
  res.render('index');
});

// Route to show login page
app.get('/auth/login', (req, res) => {
  res.render('login');
});

// Route to show registration page
app.get('/auth/register', (req, res) => {
  res.render('register');
});

// Registration submission (POST)
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Generate TOTP secret
    const secret = speakeasy.generateSecret({ length: 20 });
    const newUser = new User({ email, 
      password: hashedPassword, 
      twoFactorSecret: secret.base32,
    });
    await newUser.save();
    
  //  console.log('Registration - Stored Secret:', secret.base32);


    return res.status(201).send('User registered successfully');
  } catch (err) {
    console.log(err);
    return res.send('Error during registration');
  }
});

// Login submission (POST)
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.send('User not found');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.send('Invalid credentials');
    }

    req.session.user = user;

   
   // console.log('Login - Using Stored Secret:', user.twoFactorSecret);
    
    const qrCodeUrl = speakeasy.otpauthURL({
      secret: user.twoFactorSecret,
      label: req.body.email,
      encoding: 'base32',
      issuer: 'YourApp',
    });

    return res.render('verify', { qrCodeUrl });
  } catch (err) {
    console.log(err);
    return res.send('Error during login');
  }
});

// TOTP verification (POST)
app.post('/auth/verify', async (req, res) => {
  const { token } = req.body
  const user = req.session.user;

  if (!user) {
    return res.send('User not logged in');
  }

  try {
    const userData = await User.findOne({ email: user.email });
    const secrett = userData.twoFactorSecret;

   // console.log('Stored Secret:', userData.twoFactorSecret);
    //console.log('Token Received:', token);


    const generatedToken = speakeasy.totp({
      secret: secrett,
      encoding: 'base32',
    });
    console.log('Generated Token (Server):', generatedToken);
    
    

    const verified = speakeasy.totp.verify({
      secret: secrett,
      encoding: 'base32',
      token,
      window: 3,  // Accepts tokens from the previous and next time intervals
    
    });

    console.log('Generated Token (Server):', verified);



    if (verified) {
      req.session.authenticated = true;
      return res.redirect('/dashboard');
    } else {
      return res.send('Invalid tokennn');
    }
  } catch (err) {
    console.log(err);
    return res.send('Error during TOTP verification');
  }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/auth/login');
  }
  res.send('Welcome to your dashboard! Your 2 FactorAuthenticationis sucessful');
});



// Password reset request (GET)
app.get('/auth/reset-password', (req, res) => {
  res.render('reset');
});

// Password reset submission (POST)
app.post('/auth/reset-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.send('User not found');
    }

    const resetToken = Math.random().toString(36).substring(2, 15);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();


    // Create the reset password URL
    const resetURL = `http://localhost:5000/auth/reset-password/${resetToken}`;


    const transporter = nodemailer.createTransport({
      service: 'gmail',
      //host: 'sandbox.smtp.mailtrap.io',
     // port: 2525,
     // secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
    });

    const mailOptions = {
      //from: 'test@mailtrap.io',

      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset Request',
      text: `You are receiving this because you (or someone else) requested a password reset.\n\n
      Please click on the following link, or paste it into your browser to complete the process:\n\n
      ${resetURL}\n\n
      If you did not request this, please ignore this email.\n`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
       // console.log(error);
        console.log('Error sending email:', error);
        return res.send('Error sending email');
      }
      console.log('Email sent:', info.response);
      return res.send('Password reset token sent to your email');
    });
  } catch (err) {
    console.log(err);
    return res.send('Error during password reset');
  }
});


// Route to render reset password page with token
app.get('/auth/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ 
    resetPasswordToken: token,
     resetPasswordExpires: { $gt: Date.now() } });

  if (!user) {
    return res.status(400).send('Password reset token is invalid or has expired.');
  }

  // Render the reset password page and pass the token
  res.render('newPassword', { token });
});

// Route to handle password reset form submission
app.post('/auth/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  try {
 
  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match.");
  }

  const user = await User.findOne({
     resetPasswordToken: token, 
    resetPasswordExpires: { $gt: Date.now() } });

  if (!user) {
    return res.status(400).send('Password reset token is invalid or has expired.');
  }

  // Hash the new password and update the user's password in the database
  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  res.send('Your password has been successfully reset. You can now log in with your new password.');
} catch (err) {
  console.error(err);
  res.send('Error updating password');
}


});




//server-side reCAPTCHA validation

//const axios = require('axios'); // Add axios for 
// POST route to handle login with reCAPTCHA validation
app.post('/auth/login', async (req, res) => {
  const { email, password, 'g-recaptcha-response': recaptchaResponse } = req.body;

  // Verify reCAPTCHA response
  const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${recaptchaResponse}`;

  try {
    const recaptchaResult = await axios.post(recaptchaVerifyUrl);

    if (!recaptchaResult.data.success) {
      return res.status(400).send('reCAPTCHA verification failed. Please try again.');
    }

    // Proceed with authentication if reCAPTCHA is successful
    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).send('Invalid email or password.');
    }

    // Assuming successful email/password login, redirect to the 2FA verification page
    req.session.userId = user._id;
    res.redirect('/auth/2fa');
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    res.status(500).send('An error occurred during login. Please try again later.');
  }
});


// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
