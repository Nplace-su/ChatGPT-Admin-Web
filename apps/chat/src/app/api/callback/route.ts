import { NextRequest } from "next/server";
import { handleCallback } from "@/lib/pay/xunhu";
import { OrderLogic, SubscriptionLogic } from "database";


const getLastMatchingSubscriptionEndsAt = (subscriptions: { plan: string; endsAt: number }[], orderPlan: string): number => {
  for (let i = subscriptions.length - 1; i >= 0; i--) {
    if (subscriptions[i].plan === orderPlan) {
      return subscriptions[i].endsAt;
    }
  }
  return Date.now();
};
/**
 * This is the callback interface for processing payment platforms.
 * @constructor
 * @param req
 */
export async function POST(req: NextRequest) {
  const orderId = await handleCallback(req);
  if (!orderId) return new Response("failed");

  const orderLogic = new OrderLogic();

  // Modify order status.
  const order = await orderLogic.getOrder(orderId);

  if (order?.status === "pending") {
    await orderLogic.updateStatus(orderId, "paid");
  }
  const user = order!.email;

  // Add subscription for users.
  const subscriptionLogic = new SubscriptionLogic();
  const userSubscription = await subscriptionLogic.listUserSubscriptions(order!.email);
  const startsAt = getLastMatchingSubscriptionEndsAt(userSubscription, order!.plan);
  await subscriptionLogic.append(order!.email, {
    startsAt,
    endsAt: startsAt + 1000 * 60 * 60 * 24 * 31 * order!.count,
    plan: order!.plan,
    tradeOrderId: orderId,
  });

  return new Response("success"); // 规定返回值 不可修改
}

export const runtime = 'edge';
