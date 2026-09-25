import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "STRIPE_SECRET_KEY is not configured" },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return Response.json(
        { error: "STRIPE_WEBHOOK_SECRET is not configured" },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_URL) {
      return Response.json(
        { error: "SUPABASE_URL is not configured" },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
        { status: 500 }
      );
    }

    // Stripe requires the ORIGINAL raw request body
    const rawBody = await request.text();

    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return Response.json(
        { error: "Missing Stripe signature" },
        { status: 400 }
      );
    }

    // Verify Stripe webhook
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Stripe signature verification failed:", error);

      return Response.json(
        { error: "Invalid Stripe webhook signature" },
        { status: 400 }
      );
    }

    console.log("Stripe event received:", event.type);

    // We only need this event for creating orders
    if (event.type !== "checkout.session.completed") {
      return Response.json({
        received: true,
        ignored: true,
        event_type: event.type
      });
    }

    const session = event.data.object;

    // Prevent duplicate orders
    const { data: existingOrder, error: existingOrderError } =
      await supabase
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

    if (existingOrderError) {
      console.error("Duplicate-check error:", existingOrderError);

      return Response.json(
        { error: existingOrderError.message },
        { status: 500 }
      );
    }

    if (existingOrder) {
      console.log("Order already exists:", existingOrder.id);

      return Response.json({
        received: true,
        already_exists: true,
        order_id: existingOrder.id
      });
    }

    // Customer information
    const customerDetails = session.customer_details || {};
    const address = customerDetails.address || {};

    const customerEmail =
      session.customer_email ||
      customerDetails.email ||
      null;

    const customerPhone =
      session.metadata?.customerPhone ||
      customerDetails.phone ||
      null;

    const totalAmount =
      Number(session.amount_total || 0) / 100;

    const currency =
      String(session.currency || "sek").toUpperCase();

    // Create order
    const orderInsert = {
      user_id: null,

      customer_name:
        customerDetails.name || null,

      customer_email: customerEmail,

      customer_phone: customerPhone,

      shipping_address:
        address.line1 || null,

      shipping_city:
        address.city || null,

      shipping_postal_code:
        address.postal_code || null,

      shipping_country:
        address.country || null,

      total_amount:
        totalAmount,

      currency:
        currency,

      payment_status:
        "paid",

      fulfillment_status:
        "pending",

      stripe_session_id:
        session.id,

      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,

      dsers_status:
        "pending"
    };

    const {
      data: order,
      error: orderError
    } = await supabase
      .from("orders")
      .insert(orderInsert)
      .select("id")
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);

      return Response.json(
        { error: orderError.message },
        { status: 500 }
      );
    }

    console.log("Order created:", order.id);

    // Get Stripe line items
    const lineItems =
      await stripe.checkout.sessions.listLineItems(
        session.id,
        {
          limit: 100,
          expand: ["data.price.product"]
        }
      );

    const orderItems = [];

    for (const lineItem of lineItems.data) {
      const price = lineItem.price;

      const product =
        price?.product;

      let productId = null;

      let productName =
        lineItem.description || "Product";

      // Product metadata contains our Supabase product ID
      if (
        product &&
        typeof product !== "string"
      ) {
        productId =
          product.metadata?.product_id || null;

        if (product.name) {
          productName =
            product.name;
        }
      }

      const quantity =
        Number(lineItem.quantity || 1);

      const unitPrice =
        Number(price?.unit_amount || 0) / 100;

      orderItems.push({
        order_id:
          order.id,

        product_id:
          productId,

        product_name:
          productName,

        sku:
          null,

        supplier_product_id:
          null,

        quantity:
          quantity,

        unit_price:
          unitPrice
      });
    }

    // Save order items
    if (orderItems.length > 0) {
      const {
        error: itemsError
      } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error(
          "Order items insert error:",
          itemsError
        );

        return Response.json(
          {
            error:
              itemsError.message,
            order_id:
              order.id
          },
          { status: 500 }
        );
      }
    }

    console.log(
      "Order items saved:",
      orderItems.length
    );

    return Response.json({
      received: true,
      success: true,
      order_id: order.id,
      items: orderItems.length
    });

  } catch (error) {
    console.error(
      "Stripe webhook error:",
      error
    );

    return Response.json(
      {
        error:
          error?.message ||
          "Webhook processing failed"
      },
      { status: 500 }
    );
  }
}
