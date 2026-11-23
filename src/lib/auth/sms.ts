/** Sends the sign-in code. A real provider (for example Unifonic or Twilio) implements this. */
export interface SmsSender {
  readonly name: string;
  send(phone: string, text: string): Promise<void>;
}

/** Development only: prints the code to the server log instead of sending it. */
export class DevSmsSender implements SmsSender {
  readonly name = "dev";
  async send(phone: string, text: string) {
    console.info(`[sms:dev] to ${phone}: ${text}`);
  }
}

export function getSmsSender(env: Record<string, string | undefined> = process.env): SmsSender {
  const choice = env.SMS_PROVIDER || (env.NODE_ENV === "production" ? "" : "dev");
  if (choice === "dev") return new DevSmsSender();
  throw new Error(`No SMS provider configured (SMS_PROVIDER="${choice}"). Set SMS_PROVIDER=dev for local use.`);
}
