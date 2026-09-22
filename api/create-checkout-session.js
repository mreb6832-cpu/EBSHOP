import Stripe from "stripe";

export default async function handler(req, res) {

  // CORS
  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://ebshop.vercel.app"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  // Browser preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }


  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }


  try {

    // Check Stripe key
    const secretKey =
      process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return res.status(500).json({
        error: "STRIPE_SECRET_KEY is not configured"
      });
    }


    // Create Stripe client
    const stripe = new Stripe(secretKey);


    const {
      items,
      customerEmail,
      customerPhone,
      paymentMethod
    } = req.body || {};


    // Check cart
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Cart is empty"
      });
    }


    // Build Stripe products
    const lineItems = items.map((item) => {

      const price = Number(item.price);
      const quantity = Number(item.quantity);


      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Invalid product price");
      }


      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        throw new Error("Invalid product quantity");
      }


      return {

        price_data: {

          currency: "sek",

          product_data: {
            name: String(
              item.name ||
              "E&B SHOP Product"
            )
          },

          unit_amount:
            Math.round(price * 100)

        },

        quantity

      };

    });


    // Frontend URL
    const baseUrl =
      process.env.FRONTEND_URL;


    if (!baseUrl) {
      return res.status(500).json({
        error: "FRONTEND_URL is not configured"
      });
    }


    // Payment method
    let paymentMethodTypes = ["card"];


    if (paymentMethod === "swish") {
      paymentMethodTypes = ["swish"];
    }


    if (paymentMethod === "klarna") {
      paymentMethodTypes = ["klarna"];
    }


    // Create Stripe Checkout Session
    const session =
      await stripe.checkout.sessions.create({

        mode: "payment",

        line_items: lineItems,

        payment_method_types:
          paymentMethodTypes,

        customer_email:
          customerEmail || undefined,

        billing_address_collection:
          "required",

        phone_number_collection: {
          enabled: true
        },

        metadata: {

          customerPhone:
            customerPhone || "",

          paymentMethod:
            paymentMethod || "card"

        },

        success_url:
          `${baseUrl}/orders.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${baseUrl}/payment.html?payment=cancelled`

      });


    // Return Stripe Checkout URL
    return res.status(200).json({
      url: session.url
    });


  } catch (error) {

    console.error(
      "Stripe Checkout Error:",
      error
    );


    return res.status(500).json({
      error:
        error?.message ||
        "Could not create Stripe Checkout session"
    });

  }

}
