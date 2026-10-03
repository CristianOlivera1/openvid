import { Resend } from "resend";

let _resend: Resend | null = null;

export const getResend = (): Resend => {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    _resend = new Resend(key);
  }
  return _resend;
};

// Backward-compatible proxy object
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const client = getResend();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});