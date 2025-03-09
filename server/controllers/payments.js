const Course = require("../models/Course")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const CourseProgress = require("../models/CourseProgress")
const QRCode = require('qrcode')

// Generate QR Code for UPI payment
exports.generatePaymentQR = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id; // Get userId from authenticated user
        
        // Validate courseId
        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: "Please provide course ID",
            });
        }

        // Get course and user details
        const course = await Course.findById(courseId);
        const user = await User.findById(userId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        // Check if user is already enrolled
        if (user.courses.includes(courseId)) {
            return res.status(400).json({
                success: false,
                message: "You are already enrolled in this course",
            });
        }

        // Generate UPI payment string
        const upiString = `upi://pay?pa=${process.env.UPI_ID}&pn=StudyNotion&am=${course.price}&tn=Course-${courseId}`;
        
        // Generate QR code
        const qrCode = await QRCode.toDataURL(upiString);

        res.status(200).json({
            success: true,
            message: "QR Code generated successfully",
            data: {
                qrCode,
                amount: course.price,
                course: course.courseName,
                upiString
            }
        });

    } catch (error) {
        console.error("QR Code Generation Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate QR code",
            error: error.message
        });
    }
};

// Verify Payment and Enroll Course
exports.verifyPayment = async (req, res) => {
    try {
        const { courseId, transactionId, paymentMethod } = req.body;
        const userId = req.user.id; // Get userId from authenticated user

        // Validate input
        if (!courseId || !transactionId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields",
            });
        }

        // Find the course and user
        const course = await Course.findById(courseId);
        const user = await User.findById(userId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        // Check if user is already enrolled
        if (user.courses.includes(courseId)) {
            return res.status(400).json({
                success: false,
                message: "You are already enrolled in this course",
            });
        }

        // Create course progress
        const courseProgress = await CourseProgress.create({
            courseID: courseId,
            userId: userId,
            completedVideos: [],
        });

        // Update user's enrolled courses
        user.courses.push(courseId);
        user.courseProgress.push(courseProgress._id);
        await user.save();

        // Update course's enrolled students
        course.studentsEnroled.push(userId);
        await course.save();

        // Send confirmation emails
        try {
            await mailSender(
                user.email,
                "Course Enrollment Confirmation",
                courseEnrollmentEmail(course.courseName, user.firstName)
            );

            await mailSender(
                user.email,
                "Payment Success",
                paymentSuccessEmail(
                    course.courseName,
                    user.firstName,
                    course.price,
                    transactionId,
                    paymentMethod
                )
            );
        } catch (emailError) {
            console.log("Error sending email:", emailError);
            // Continue with the success response even if email fails
        }

        return res.status(200).json({
            success: true,
            message: "Course enrollment successful",
            data: {
                courseId,
                courseName: course.courseName,
                transactionId
            }
        });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify payment",
            error: error.message
        });
    }
};

// Google Pay Payment Intent
exports.createGooglePayIntent = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id; // Get userId from authenticated user

        // Validate courseId
        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: "Please provide course ID",
            });
        }

        // Get course and user details
        const course = await Course.findById(courseId);
        const user = await User.findById(userId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }

        // Check if user is already enrolled
        if (user.courses.includes(courseId)) {
            return res.status(400).json({
                success: false,
                message: "You are already enrolled in this course",
            });
        }

        // Create payment intent for Google Pay
        const paymentIntent = {
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: [{
                type: 'CARD',
                parameters: {
                    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                    allowedCardNetworks: ['MASTERCARD', 'VISA'],
                },
                tokenizationSpecification: {
                    type: 'PAYMENT_GATEWAY',
                    parameters: {
                        gateway: 'example',
                        gatewayMerchantId: process.env.MERCHANT_ID,
                    },
                },
            }],
            merchantInfo: {
                merchantId: process.env.MERCHANT_ID,
                merchantName: 'StudyNotion'
            },
            transactionInfo: {
                totalPriceStatus: 'FINAL',
                totalPrice: course.price.toString(),
                currencyCode: 'INR'
            }
        };

        res.status(200).json({
            success: true,
            message: "Payment intent created successfully",
            data: paymentIntent
        });

    } catch (error) {
        console.error("Google Pay Intent Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create payment intent",
            error: error.message
        });
    }
};