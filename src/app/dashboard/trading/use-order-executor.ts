"use client";

import { useEffect, useRef } from "react";
import { fillOrder, type PendingOrder } from "@/lib/actions/orders";
import type { Quote } from "./use-live-prices";

export function useOrderExecutor(
  orders: PendingOrder[],
  prices: Map<string, Quote>,
  onFilled: () => void,
) {
  const fillingRef = useRef(new Set<string>());

  useEffect(() => {
    for (const order of orders) {
      if (order.status !== "pending") continue;
      if (fillingRef.current.has(order.id)) continue;

      const quote = prices.get(order.ticker);
      if (!quote) continue;

      let shouldFill = false;

      switch (order.orderType) {
        case "limit_buy":
          // Buy when price drops to or below target
          shouldFill = quote.price <= order.targetPrice;
          break;
        case "limit_sell":
          // Sell when price rises to or above target
          shouldFill = quote.price >= order.targetPrice;
          break;
        case "stop_loss":
          // Sell when price drops to or below target
          shouldFill = quote.price <= order.targetPrice;
          break;
      }

      if (shouldFill) {
        fillingRef.current.add(order.id);
        fillOrder(order.id, quote.price)
          .then(() => onFilled())
          .finally(() => fillingRef.current.delete(order.id));
      }
    }
  }, [orders, prices, onFilled]);
}
