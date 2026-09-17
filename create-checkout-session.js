import Stripe from "stripe";

const stripe = new Stripe(process.env.sk_test_51UGjjHIR2mKP3engPHxTO1rNm7SdBw5Y0IhDCaJTZNn2cWmvcUjuQ6B0H5TTvLz7y9nDv0JSeZ2lZAH5qgt6Th6z00nhEzLosd);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Cart is empty",
      });
    }

    const lineItems = items.map((item) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Invalid product price");
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Invalid product quantity");
      }

      return {
        price_data: {
          currency: "sek",
          product_data: {
            name: String(item.name || "E&B SHOP Product"),
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: quantity,
      };
    });

    const baseUrl = process.env.FRONTEND_URL;

    if (!baseUrl) {
      return res.status(500).json({
        error: "FRONTEND_URL is not configured",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,

      billing_address_collection: "required",

      phone_number_collection: {
        enabled: true,
      },

      success_url:
        `${baseUrl}/orders.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${baseUrl}/payment.html?payment=cancelled`,
    });

    return res.status(200).json({
      url: session.url,
    });

  } catch (error) {
    console.error("Stripe Checkout Error:", error);

    return res.status(500).json({
      error: "Could not create Stripe Checkout session",
    });
  }
}
