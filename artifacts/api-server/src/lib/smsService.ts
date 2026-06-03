import { shouldExposeDevPhoneOtp } from "./phoneVerification";

export type SmsPurpose = "phone_verification" | "login_2fa" | "password_reset";

export type SmsSendInput = {
  to: string;
  body: string;
  purpose: SmsPurpose;
  code?: string;
};

export type SmsSendResult = {
  provider: "dev_mock" | "twilio" | "egypt_gateway" | "firebase";
  mocked: boolean;
};

type SmsProvider = {
  send(input: SmsSendInput): Promise<SmsSendResult>;
};

class DevMockSmsProvider implements SmsProvider {
  async send(input: SmsSendInput): Promise<SmsSendResult> {
    if (shouldExposeDevPhoneOtp() && input.code) {
      console.info(`[dev-only] SMS OTP for ${input.to} (${input.purpose}): ${input.code}`);
    } else {
      console.info(`[sms:dev-mock] Simulated SMS for ${input.to} (${input.purpose}).`);
    }

    return { provider: "dev_mock", mocked: true };
  }
}

class UnconfiguredProductionSmsProvider implements SmsProvider {
  async send(): Promise<SmsSendResult> {
    throw new Error("SMS provider is not configured.");
  }
}

function createSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();

  if (provider === "twilio") {
    // TODO: Wire Twilio when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER are configured.
    return process.env.NODE_ENV === "production"
      ? new UnconfiguredProductionSmsProvider()
      : new DevMockSmsProvider();
  }

  if (provider === "egypt_gateway") {
    // TODO: Wire local gateway when EGYPT_SMS_GATEWAY_URL and EGYPT_SMS_GATEWAY_API_KEY are configured.
    return process.env.NODE_ENV === "production"
      ? new UnconfiguredProductionSmsProvider()
      : new DevMockSmsProvider();
  }

  if (provider === "firebase") {
    // TODO: Firebase phone auth would usually verify through Firebase SDK instead of this OTP store.
    return process.env.NODE_ENV === "production"
      ? new UnconfiguredProductionSmsProvider()
      : new DevMockSmsProvider();
  }

  return process.env.NODE_ENV === "production"
    ? new UnconfiguredProductionSmsProvider()
    : new DevMockSmsProvider();
}

export async function sendSms(input: SmsSendInput): Promise<SmsSendResult> {
  return createSmsProvider().send(input);
}
