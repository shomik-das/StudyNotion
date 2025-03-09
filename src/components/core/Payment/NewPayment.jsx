import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import GooglePayButton from '@google-pay/button-react';
import QRCode from 'react-qr-code';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function NewPayment({ course }) {
    const { token } = useSelector((state) => state.auth);
    const { user } = useSelector((state) => state.profile);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [qrCodeData, setQrCodeData] = useState(null);

    const handleQRPayment = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/payment/generate-qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    courseId: course._id,
                    userId: user._id,
                    amount: course.price,
                }),
            });
            const data = await response.json();
            
            if (data.success) {
                setQrCodeData(data.data);
                toast.success('QR Code generated successfully');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            toast.error('Failed to generate QR code');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentVerification = async (transactionId, paymentMethod) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/payment/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    courseId: course._id,
                    userId: user._id,
                    transactionId,
                    paymentMethod,
                }),
            });
            const data = await response.json();
            
            if (data.success) {
                toast.success('Payment successful');
                navigate('/dashboard/enrolled-courses');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            toast.error('Payment verification failed');
        }
    };

    const handleGooglePaySuccess = async (paymentData) => {
        await handlePaymentVerification(paymentData.transactionId, 'GOOGLE_PAY');
    };

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-richblack-900 text-white">
            <div className="mx-auto w-11/12 max-w-maxContent py-12 md:py-24">
                <p className="text-3xl font-semibold text-richblack-5">Payment Options</p>
                <div className="my-8 flex flex-col gap-8">
                    {/* Google Pay Button */}
                    <div className="w-full max-w-[450px]">
                        <p className="mb-4 text-lg">Pay with Google Pay</p>
                        <GooglePayButton
                            environment="TEST"
                            buttonColor="white"
                            buttonType="buy"
                            paymentRequest={{
                                apiVersion: 2,
                                apiVersionMinor: 0,
                                allowedPaymentMethods: [{
                                    type: 'CARD',
                                    parameters: {
                                        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                                        allowedCardNetworks: ['MASTERCARD', 'VISA'],
                                    },
                                }],
                                merchantInfo: {
                                    merchantId: process.env.REACT_APP_MERCHANT_ID,
                                    merchantName: 'StudyNotion',
                                },
                                transactionInfo: {
                                    totalPriceStatus: 'FINAL',
                                    totalPrice: course.price.toString(),
                                    currencyCode: 'INR',
                                },
                            }}
                            onLoadPaymentData={handleGooglePaySuccess}
                            className="w-full"
                        />
                    </div>

                    {/* QR Code Payment */}
                    <div className="w-full max-w-[450px]">
                        <p className="mb-4 text-lg">Pay with UPI QR Code</p>
                        <button
                            onClick={handleQRPayment}
                            disabled={loading}
                            className="cursor-pointer rounded-md bg-yellow-50 px-6 py-3 text-center text-richblack-900 font-semibold transition-all duration-200 hover:scale-95 w-full"
                        >
                            {loading ? 'Generating QR...' : 'Generate UPI QR Code'}
                        </button>
                        
                        {qrCodeData && (
                            <div className="mt-4 p-4 bg-richblack-800 rounded-lg flex flex-col items-center">
                                <div className="bg-white p-4 rounded-lg">
                                    <QRCode 
                                        value={qrCodeData.upiString}
                                        size={200}
                                    />
                                </div>
                                <p className="mt-4 text-lg">Scan with any UPI app to pay ₹{course.price}</p>
                                <p className="mt-2 text-sm text-richblack-300">Course: {qrCodeData.course}</p>
                                <button
                                    onClick={() => handlePaymentVerification(Date.now().toString(), 'UPI_QR')}
                                    className="mt-4 cursor-pointer rounded-md bg-yellow-50 px-6 py-3 text-center text-richblack-900 font-semibold transition-all duration-200 hover:scale-95"
                                >
                                    I've completed the payment
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 