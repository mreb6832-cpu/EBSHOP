import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false
  }
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk)
      );
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const stripeSecret =
      process.env.STRIPE_SECRET_KEY;

    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecret) {
      return res.status(500).json({
        error: "STRIPE_SECRET_KEY is not configured"
      });
    }

    if (!webhookSecret) {
      return res.status(500).json({
        error:
          "STRIPE_WEBHOOK_SECRET is not configured"
      });
    }

    if (!supabaseUrl) {
      return res.status(500).json({
        error: "SUPABASE_URL is not configured"
      });
    }

    if (!supabaseServiceKey) {
      return res.status(500).json({
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured"
      });
    }

    const stripe =
      new Stripe(stripeSecret);

    const rawBody =
      await getRawBody(req);

    const signature =
      req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({
        error: "Missing Stripe signature"
      });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error(
        "Stripe webhook signature error:",
        error.message
      );

      return res.status(400).json({
        error: "Invalid Stripe webhook signature"
      });
    }

    /*
      We only create the order after
      Stripe confirms the checkout payment.
    */
    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session = event.data.object;

      /*
        Prevent duplicate orders.
      */
      const existingResponse =
        await fetch(
          `${supabaseUrl}/rest/v1/orders?stripe_session_id=eq.${encodeURIComponent(session.id)}&select=id`,
          {
            method: "GET",
            headers: {
              apikey: supabaseServiceKey,
              Authorization:
                `Bearer ${supabaseServiceKey}`
            }
          }
        );

      if (!existingResponse.ok) {
        const errorText =
          await existingResponse.text();

        console.error(
          "Supabase lookup error:",
          errorText
        );

        return res.status(500).json({
          error: "Could not check existing order"
        });
      }

      const existingOrders =
        await existingResponse.json();

      if (
        Array.isArray(existingOrders) &&
        existingOrders.length > 0
      ) {
        return res.status(200).json({
          received: true,
          message: "Order already exists"
        });
      }

      /*
        Get products purchased from Stripe.
      */
      const lineItems =
        await stripe.checkout.sessions.listLineItems(
          session.id,
          {
            limit: 100
          }
        );

      const items =
        lineItems.data.map((item) => ({
          name:
            item.description ||
            "E&B SHOP Product",

          quantity:
            item.quantity || 1,

          price:
            item.price &&
            typeof item.price.unit_amount === "number"
              ? item.price.unit_amount / 100
              : 0
        }));

      const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        "";

      const customerPhone =
        session.customer_details?.phone ||
        session.metadata?.customerPhone ||
        "";

      const paymentMethod =
        session.metadata?.paymentMethod ||
        "card";

      const amount =
        typeof session.amount_total === "number"
          ? session.amount_total / 100
          : 0;

      const paymentStatus =
        session.payment_status ||
        "pending";

      const order = {
        stripe_session_id:
          session.id,

        customer_email:
          customerEmail,

        customer_phone:
          customerPhone,

        amount,

        currency:
          String(
            session.currency || "sek"
          ).toUpperCase(),

        payment_method:
          paymentMethod,

        payment_status:
          paymentStatus,

        items
      };

      /*
        Insert order into Supabase.
      */
      const insertResponse =
        await fetch(
          `${supabaseUrl}/rest/v1/orders`,
          {
            method: "POST",

            headers: {
              apikey:
                supabaseServiceKey,

              Authorization:
                `Bearer ${supabaseServiceKey}`,

              "Content-Type":
                "application/json",

              Prefer:
                "return=minimal"
            },

            body:
              JSON.stringify(order)
          }
        );

      if (!insertResponse.ok) {
        const errorText =
          await insertResponse.text();

        console.error(
          "Supabase order insert error:",
          errorText
        );

        return res.status(500).json({
          error:
            "Could not save order"
        });
      }

      console.log(
        "E&B SHOP order created:",
        session.id
      );
    }

    return res.status(200).json({
      received: true
    });

  } catch (error) {
    console.error(
      "Stripe Webhook Error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Webhook processing failed"
    });
  }
}
