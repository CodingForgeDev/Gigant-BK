const express = require("express");
const auth = require("../middleware/auth");
const Plan = require("../models/Plan");
const Organization = require("../models/Organization");
const Subscription = require("../models/Subscription");

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require("stripe")(process.env.STRIPE_SECRET_KEY);
}

router.post("/checkout", auth, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured" });

    const { planId, organizationId } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    if (plan.price === 0) return res.status(400).json({ message: "Free plans don't need checkout" });

    const org = await Organization.findById(organizationId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const session = await stripe.checkout.sessions.create({
      mode: plan.interval === "one_time" ? "payment" : "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${plan.name} — ${org.name}` },
            unit_amount: Math.round(plan.price * 100),
            ...(plan.interval !== "one_time" && {
              recurring: { interval: plan.interval === "year" ? "year" : "month" },
            }),
          },
          quantity: 1,
        },
      ],
      metadata: {
        planId: plan._id.toString(),
        organizationId: org._id.toString(),
        adminId: req.admin._id.toString(),
      },
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/plans?success=true`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/plans?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/subscriptions", auth, async (req, res) => {
  try {
    const { organizationId } = req.query;
    const filter = {};
    if (organizationId) filter.organization = organizationId;
    else {
      const orgs = await Organization.find({
        $or: [{ owner: req.admin._id }, { "members.admin": req.admin._id }],
      });
      filter.organization = { $in: orgs.map((o) => o._id) };
    }

    const subs = await Subscription.find(filter)
      .populate("plan", "name slug price interval")
      .populate("organization", "name slug")
      .sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/cancel", auth, async (req, res) => {
  try {
    const stripe = getStripe();
    const sub = await Subscription.findById(req.body.subscriptionId);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    if (stripe && sub.stripeSubscriptionId) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    sub.cancelAtPeriodEnd = true;
    await sub.save();
    res.json({ message: "Subscription will cancel at period end" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.sendStatus(400);

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.sendStatus(400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { planId, organizationId } = session.metadata;

    await Subscription.findOneAndUpdate(
      { organization: organizationId },
      {
        organization: organizationId,
        plan: planId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    await Organization.findByIdAndUpdate(organizationId, { plan: planId });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: sub.id },
      { status: "canceled" }
    );
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: invoice.subscription },
      { status: "past_due" }
    );
  }

  res.sendStatus(200);
});

module.exports = router;
