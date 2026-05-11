function generateReservationReference() {
  const date = new Date();
  const stamp = date.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NOF-${stamp}-${random}`;
}

module.exports = generateReservationReference;
