import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      lineItems,
      customerEmail,
      customerPhone
    } = req.body || {};

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({
        error: "No items provided"
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "STRIPE_SECRET_KEY is not configured"
      });
    }

    const baseUrl =
      process.env.FRONTEND_URL || "https://ebshop.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: lineItems,

      customer_email: customerEmail || undefined,

      billing_address_collection: "required",

      phone_number_collection: {
        enabled: true
      },

      metadata: {
        customerPhone: customerPhone || ""
      },

      success_url:
        `${baseUrl}/orders.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${baseUrl}/payment.html?payment=cancelled`
    });

    return res.status(200).json({
      id: session.id,
      url: session.url
    });

  } catch (error) {
    console.error("Stripe checkout error:", error);

    return res.status(500).json({
      error: error?.message || "Unable to create checkout session"
    });
  }
}
