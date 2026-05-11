function generateOrderReference() {
  const date = new Date();
  const stamp = date.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NOF-ORD-${stamp}-${random}`;
}

module.exports = generateOrderReference;
