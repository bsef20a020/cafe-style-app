export const reservationStatusOptions = ["new", "confirmed", "seated", "completed", "cancelled"];
export const orderStatusOptions = ["new", "accepted", "preparing", "ready", "completed", "cancelled"];
export const paymentStatusOptions = ["unpaid", "pending", "paid", "failed", "refunded"];

const reservationTransitions = {
  new: ["confirmed", "cancelled"],
  confirmed: ["seated", "cancelled"],
  seated: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

const orderTransitions = {
  new: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

const paymentTransitions = {
  unpaid: ["pending", "paid"],
  pending: ["paid", "failed"],
  failed: ["pending", "unpaid"],
  paid: ["refunded"],
  refunded: []
};

function transitionOptions(transitions, current) {
  return Array.from(new Set([current, ...(transitions[current] || [])].filter(Boolean)));
}

export function reservationOptionsFor(status) {
  return transitionOptions(reservationTransitions, status);
}

export function orderOptionsFor(status) {
  return transitionOptions(orderTransitions, status);
}

export function paymentOptionsFor(status) {
  return transitionOptions(paymentTransitions, status);
}

export function latestHistoryEntry(history = [], field) {
  return [...history].reverse().find((entry) => entry.field === field);
}

