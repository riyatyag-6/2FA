const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-totp', authController.verifyTOTP);
router.post('/reset-password', authController.resetPasswordRequest);
router.get('/reset-password/:token', authController.resetPasswordForm);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
