import ReservationForm from "../components/ReservationForm";

function ReservePage() {
  return (
    <section className="page-section reserve-page">
      <div className="page-intro">
        <span className="section-kicker">Reserve</span>
        <h1>Send the table request in under a minute.</h1>
        <p>The admin team gets the booking in the dashboard, and you get a reference for quick WhatsApp confirmation.</p>
      </div>
      <ReservationForm />
    </section>
  );
}

export default ReservePage;
