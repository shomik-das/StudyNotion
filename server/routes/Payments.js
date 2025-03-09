// Import the required modules
const express = require("express")
const router = express.Router()

// Import the required controllers and middleware functions
const {
  generatePaymentQR,
  verifyPayment,
  createGooglePayIntent,
} = require("../controllers/payments")
const { auth, isStudent } = require("../middleware/auth")

// Routes for Payment
// ********************************************************************************************************
//                          Payment routes
// ********************************************************************************************************

// Route for generating QR code for payment
router.post("/generate-qr", auth, isStudent, generatePaymentQR)

// Route for verifying the payment
router.post("/verify", auth, isStudent, verifyPayment)

// Route for creating Google Pay payment intent
router.post("/google-pay-intent", auth, isStudent, createGooglePayIntent)

module.exports = router
