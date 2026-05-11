import { CalendarCheck, Loader2, MessageCircle, PencilLine, RotateCcw, Send, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, getWhatsAppNumber } from "../api/client";
import { useCustomerAuth } from "../auth/CustomerAuthContext";
import {
  getBusinessHourSlots,
  getDateAvailabilityMessage,
  reservationToForm,
  todayInputValue
} from "../utils/reservationRules";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  date: "",
  time: "",
  guests: "2",
  occasion: "",
  message: ""
};

function formForCustomer(user) {
  return {
    ...initialForm,
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || ""
  };
}

function ReservationForm() {
  const { user } = useCustomerAuth();
  const [form, setForm] = useState(() => formForCustomer(null));
  const [status, setStatus] = useState({ type: "idle" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmedReservation, setConfirmedReservation] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [editingReference, setEditingReference] = useState("");
  const fieldRefs = useRef({});

  const today = useMemo(() => todayInputValue(), []);
  const availableSlots = useMemo(() => getBusinessHourSlots(form.date), [form.date]);
  const dateAvailabilityMessage = useMemo(() => getDateAvailabilityMessage(form.date), [form.date]);

  useEffect(() => {
    if (!user) return;

    setForm((current) => ({
      ...current,
      name: current.name || user.name || "",
      phone: current.phone || user.phone || "",
      email: current.email || user.email || ""
    }));
  }, [user]);

  const whatsappHref = useMemo(() => {
    if (!confirmedReservation || status.type === "cancelled") return "";
    const reservation = confirmedReservation;
    const text = [
      "Hi NOFFELO, I submitted a reservation request.",
      `Reference: ${reservation.reference}`,
      `Name: ${reservation.name}`,
      `Guests: ${reservation.guests}`,
      `Date: ${reservation.date}`,
      `Time: ${reservation.time}`
    ].join("\n");
    return `https://wa.me/${getWhatsAppNumber(whatsappNumber)}?text=${encodeURIComponent(text)}`;
  }, [confirmedReservation, status.type, whatsappNumber]);

  function updateField(event) {
    const { name, value } = event.target;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      if (name === "date") delete next.time;
      return next;
    });

    setForm((current) => {
      if (name !== "date") {
        return { ...current, [name]: value };
      }

      const nextSlots = getBusinessHourSlots(value);
      const currentTimeStillAvailable = nextSlots.some((slot) => slot.value === current.time);
      return {
        ...current,
        date: value,
        time: currentTimeStillAvailable ? current.time : nextSlots[0]?.value || ""
      };
    });
  }

  function fieldMessage(name) {
    const value = fieldErrors[name];
    return Array.isArray(value) ? value[0] : value;
  }

  function fieldA11y(name, describedBy = "") {
    const errorId = fieldMessage(name) ? `${name}-error` : "";
    return {
      ref: (element) => {
        if (element) fieldRefs.current[name] = element;
      },
      "aria-invalid": Boolean(errorId),
      "aria-describedby": [describedBy, errorId].filter(Boolean).join(" ") || undefined
    };
  }

  function focusFirstError(errors) {
    const firstField = ["name", "phone", "email", "guests", "date", "time", "occasion", "message"].find(
      (field) => errors[field]?.length
    );

    if (firstField) {
      window.setTimeout(() => fieldRefs.current[firstField]?.focus(), 0);
    }
  }

  function validateAvailability() {
    const nextErrors = {};

    if (dateAvailabilityMessage) {
      nextErrors.date = [dateAvailabilityMessage];
    }

    if (form.date && !availableSlots.length) {
      nextErrors.time = ["Choose a date with available reservation slots."];
    } else if (!form.time) {
      nextErrors.time = ["Choose a reservation time."];
    }

    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    focusFirstError(nextErrors);
    return !Object.keys(nextErrors).length;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateAvailability()) {
      setStatus({ type: "error", message: "Please check the reservation details and try again." });
      return;
    }

    setStatus({ type: "loading" });
    setFieldErrors({});

    try {
      const payload = {
        ...form,
        source: "website",
        verificationPhone: editingReference ? confirmedReservation?.phone || form.phone : undefined
      };
      const data = editingReference
        ? await api.updateReservationRequest(editingReference, payload)
        : await api.createReservation(payload);

      setConfirmedReservation(data.reservation);
      setWhatsappNumber(data.whatsappNumber || whatsappNumber);
      setStatus({
        type: "success",
        message: editingReference ? "Reservation changes saved." : "Reservation request received."
      });
      setEditingReference("");
      setForm(formForCustomer(user));
    } catch (error) {
      const details = error.details || {};
      setFieldErrors(details);
      focusFirstError(details);
      setStatus({
        type: "error",
        message: error.details ? "Please check the highlighted fields and try again." : "Reservation could not be saved. Please try again."
      });
    }
  }

  function startModify() {
    if (!confirmedReservation) return;
    setEditingReference(confirmedReservation.reference);
    setForm(reservationToForm(confirmedReservation));
    setFieldErrors({});
    setStatus({ type: "idle" });
  }

  async function cancelReservation() {
    if (!confirmedReservation) return;

    setStatus({ type: "cancelling" });
    setFieldErrors({});

    try {
      const data = await api.cancelReservationRequest(confirmedReservation.reference, {
        phone: confirmedReservation.phone
      });
      setConfirmedReservation(data.reservation);
      setStatus({ type: "cancelled", message: "Reservation request cancelled." });
      setEditingReference("");
      setForm(formForCustomer(user));
    } catch (error) {
      const details = error.details || {};
      setFieldErrors(details);
      focusFirstError(details);
      setStatus({
        type: "error",
        message: error.details
          ? "Phone verification failed for this reservation."
          : "Reservation could not be cancelled. Please contact the team on WhatsApp."
      });
    }
  }

  function resetFlow() {
    setConfirmedReservation(null);
    setWhatsappNumber("");
    setEditingReference("");
    setFieldErrors({});
    setStatus({ type: "idle" });
    setForm(formForCustomer(user));
  }

  return (
    <section className="reservation-panel" id="reserve">
      <div className="section-kicker">
        <CalendarCheck size={17} />
        Reservations
      </div>
      <h2>Plan the table before the evening starts.</h2>
      <p className="section-copy">Send a request to the cafe team and keep the booking reference for WhatsApp follow-up.</p>

      {confirmedReservation && ["success", "cancelling", "cancelled"].includes(status.type) ? (
        <div className={status.type === "cancelled" ? "success-state cancelled-state" : "success-state"} role="status">
          <strong>
            {status.type === "cancelled" ? "Request cancelled" : status.message}: {confirmedReservation.reference}
          </strong>
          <p>
            {status.type === "cancelled"
              ? "The request is marked as cancelled. You can start a fresh booking anytime."
              : "We saved your request. Keep the reference for WhatsApp confirmation or adjust the request below."}
          </p>
          <dl className="reservation-summary">
            <div>
              <dt>Name</dt>
              <dd>{confirmedReservation.name}</dd>
            </div>
            <div>
              <dt>Visit</dt>
              <dd>
                {confirmedReservation.date} · {confirmedReservation.time}
              </dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{confirmedReservation.guests}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{confirmedReservation.status}</dd>
            </div>
          </dl>
          {status.type === "cancelled" ? (
            <button className="button primary" type="button" onClick={resetFlow}>
              <RotateCcw size={18} />
              Book another table
            </button>
          ) : (
            <div className="success-actions">
              <a className="button primary" href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle size={18} />
                Continue on WhatsApp
              </a>
              <button className="button ghost" type="button" onClick={startModify} disabled={status.type === "cancelling"}>
                <PencilLine size={18} />
                Modify request
              </button>
              <button className="button danger-button" type="button" onClick={cancelReservation} disabled={status.type === "cancelling"}>
                {status.type === "cancelling" ? <Loader2 className="spin" size={18} /> : <XCircle size={18} />}
                Cancel request
              </button>
            </div>
          )}
        </div>
      ) : null}

      <form className="reservation-form" onSubmit={handleSubmit}>
        {editingReference ? <p className="reservation-edit-banner wide">Editing request {editingReference}</p> : null}
        <label>
          Name
          <input name="name" value={form.name} onChange={updateField} required minLength={2} placeholder="Your full name" {...fieldA11y("name")} />
          <FieldError id="name-error" message={fieldMessage("name")} />
        </label>
        <label>
          Phone
          <input name="phone" value={form.phone} onChange={updateField} required minLength={7} placeholder="+92 300 1234567" {...fieldA11y("phone")} />
          <FieldError id="phone-error" message={fieldMessage("phone")} />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={updateField} placeholder="Optional" {...fieldA11y("email")} />
          <FieldError id="email-error" message={fieldMessage("email")} />
        </label>
        <label>
          Guests
          <input name="guests" type="number" min="1" max="20" value={form.guests} onChange={updateField} required {...fieldA11y("guests")} />
          <FieldError id="guests-error" message={fieldMessage("guests")} />
        </label>
        <label>
          Date
          <input name="date" type="date" min={today} value={form.date} onChange={updateField} required {...fieldA11y("date", "date-help")} />
          {dateAvailabilityMessage ? (
            <span className="field-help unavailable" id="date-help">
              {dateAvailabilityMessage}
            </span>
          ) : null}
          <FieldError id="date-error" message={fieldMessage("date")} />
        </label>
        <label>
          Time
          <select
            name="time"
            value={form.time}
            onChange={updateField}
            required
            disabled={!form.date || !availableSlots.length}
            {...fieldA11y("time", "time-help")}
          >
            <option value="">{form.date ? "Choose a time" : "Choose date first"}</option>
            {availableSlots.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          <span className="field-help" id="time-help">
            Reservation slots run from 9:00 AM to 10:30 PM PKT.
          </span>
          <FieldError id="time-error" message={fieldMessage("time")} />
        </label>
        <label>
          Occasion
          <input name="occasion" value={form.occasion} onChange={updateField} placeholder="Birthday, casual meet, work session" {...fieldA11y("occasion")} />
          <FieldError id="occasion-error" message={fieldMessage("occasion")} />
        </label>
        <label className="wide">
          Notes
          <textarea
            name="message"
            value={form.message}
            onChange={updateField}
            rows="4"
            placeholder="Any seating, timing, or menu notes"
            {...fieldA11y("message")}
          />
          <FieldError id="message-error" message={fieldMessage("message")} />
        </label>

        {status.type === "error" ? <p className="form-error">{status.message}</p> : null}

        <button className="button primary wide" type="submit" disabled={status.type === "loading"}>
          {status.type === "loading" ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          {editingReference ? "Save reservation changes" : "Send reservation request"}
        </button>
      </form>
    </section>
  );
}

function FieldError({ id, message }) {
  return message ? (
    <span className="field-error" id={id} role="alert">
      {message}
    </span>
  ) : null;
}

export default ReservationForm;
