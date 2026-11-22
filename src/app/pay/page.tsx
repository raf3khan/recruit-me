import { PaddleCheckout } from "./paddle-checkout";

export const metadata = { title: "الدفع | وظيفة" };

/**
 * Paddle's "default payment link" points here. Paddle sends the candidate to
 * /pay?_ptxn=<transaction id>, and Paddle.js opens the checkout for it.
 */
export default function PayPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">نجهّز صفحة الدفع</h1>
      <p className="mt-3 text-muted">ثواني وتفتح لك صفحة الدفع الآمنة.</p>
      <PaddleCheckout
        clientToken={process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? ""}
        environment={process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox"}
      />
    </main>
  );
}
