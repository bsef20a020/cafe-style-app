const OPEN_MINUTES = 9 * 60;
const CLOSE_MINUTES = 23 * 60;
const SLOT_INTERVAL_MINUTES = 30;
const CAFE_TIME_ZONE = "Asia/Karachi";
const CAFE_TIMEZONE_OFFSET = "+05:00";

function pad(value) {
  return String(value).padStart(2, "0");
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  return `${pad(hours)}:${pad(minutes % 60)}`;
}

function cafeDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function dateInputValue(date) {
  const parts = cafeDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function slotDateTime(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue}:00${CAFE_TIMEZONE_OFFSET}`);
}

export function todayInputValue() {
  return dateInputValue(new Date());
}

export function getBusinessHourSlots(dateValue) {
  if (!dateValue) return [];

  const now = new Date();
  const slots = [];

  for (let minutes = OPEN_MINUTES; minutes < CLOSE_MINUTES; minutes += SLOT_INTERVAL_MINUTES) {
    const value = minutesToTime(minutes);
    const slotTime = slotDateTime(dateValue, value);

    if (Number.isNaN(slotTime.getTime())) continue;
    if (slotTime <= now) continue;

    slots.push({
      value,
      label: slotTime.toLocaleTimeString([], {
        timeZone: CAFE_TIME_ZONE,
        hour: "numeric",
        minute: "2-digit"
      })
    });
  }

  return slots;
}

export function getDateAvailabilityMessage(dateValue) {
  if (!dateValue) return "";

  const selectedDate = new Date(`${dateValue}T00:00:00${CAFE_TIMEZONE_OFFSET}`);
  const today = new Date(`${todayInputValue()}T00:00:00${CAFE_TIMEZONE_OFFSET}`);

  if (Number.isNaN(selectedDate.getTime())) {
    return "Choose a valid reservation date.";
  }

  if (selectedDate < today) {
    return "Past dates are not available for reservations.";
  }

  if (!getBusinessHourSlots(dateValue).length) {
    return "No reservation slots remain for this date.";
  }

  return "";
}

export function reservationToForm(reservation) {
  return {
    name: reservation.name || "",
    phone: reservation.phone || "",
    email: reservation.email || "",
    date: reservation.date || "",
    time: reservation.time || "",
    guests: String(reservation.guests || "2"),
    occasion: reservation.occasion || "",
    message: reservation.message || ""
  };
}
