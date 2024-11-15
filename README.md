# 2FA
# Project README

## Environment Setup

To run this project locally, you'll need to create a `.env` file to store sensitive configuration settings. Follow the instructions below to create and configure your `.env` file.

### Step 1: Create the `.env` File

In the root directory of the project, create a file named `.env`. This file will contain the environment variables used by the application.

### Step 2: Add the Configuration Variables

Inside your `.env` file, add the following configuration variables. **Please make sure to change the sensitive values to your own credentials before running the project.**

```dotenv
PORT=5000
MONGO_URI=mongodb://localhost:27017/authentication 

SECRET_KEY=e9726aa9492317cf0197b7ace714bf4b615b5d460ed3f1e6fef15e1306ad716357c033ecfafb9458197270 //random key generated

RECAPTCHA_SECRET=6Lf8qnsqAAAAAGfcF9wy6LEeb-3ambN477TGWItD 

EMAIL=youremail098@gmail.com
PASS=mfqs ftnt jaef sgsg........password generated through google app passsword


Step 3: Replace Sensitive Keys
1. SECRET_KEY
This is a secret key used for securing sessions and encrypting data. You should replace this with your own securely generated key. You can use an online generator to create a new secret key for your project.
2. RECAPTCHA_SECRET
This is the secret key used to verify CAPTCHA responses. Replace it with your own key generated from Google's reCAPTCHA.
3. EMAIL and PASS
These are your email and password used for sending emails in your application. For security purposes
