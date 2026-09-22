const session = await stripe.checkout.sessions.create({
  mode: "payment",

  managed_payments: {
    enabled: false
  },

  line_items: lineItems,

  customer_email:
    customerEmail || undefined,

  billing_address_collection:
    "required",

  phone_number_collection: {
    enabled: true
  },

  metadata: {
    customerPhone:
      customerPhone || ""
  },

  success_url:
    `${baseUrl}/orders.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,

  cancel_url:
    `${baseUrl}/payment.html?payment=cancelled`
});