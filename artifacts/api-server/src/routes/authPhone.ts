import { Router, type IRouter, type Response } from "express";
import { PhoneOtpError, sendPhoneOtp, verifyPhoneOtp } from "../lib/phoneOtpService";

const router: IRouter = Router();

function sendOtpError(res: Response, error: unknown) {
  if (error instanceof PhoneOtpError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      ...error.payload,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : "Phone OTP request failed.",
  });
}

router.post("/auth/phone/send-code", async (req, res) => {
  try {
    const result = await sendPhoneOtp(req.body);
    res.json(result);
  } catch (error) {
    sendOtpError(res, error);
  }
});

router.post("/auth/phone/verify-code", async (req, res) => {
  try {
    const result = await verifyPhoneOtp(req.body);
    res.json(result);
  } catch (error) {
    sendOtpError(res, error);
  }
});

export default router;
