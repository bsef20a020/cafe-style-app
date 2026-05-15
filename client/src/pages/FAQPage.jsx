import { CalendarCheck, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import FAQSection from "../components/FAQSection";

function FAQPage() {
  return (
    <section className="page-section faq-page">
      <div className="page-intro">
        <span className="section-kicker">FAQ</span>
        <h1>Good answers before you book, order, or visit.</h1>
        <p>
          Find the practical details guests usually ask about NOFFELO timings, reservations, online orders, payments,
          and follow-up.
        </p>
      </div>

      <FAQSection showHeader={false} />

      <section className="faq-contact-band" aria-label="Need more help">
        <div>
          <span className="section-kicker">Need help?</span>
          <h2>Share your reference and the team can follow up quickly.</h2>
        </div>
        <div className="hero-actions">
          <Link className="button primary" to="/reserve">
            <CalendarCheck size={18} />
            Reserve a table
          </Link>
          <a className="button ghost" href="https://wa.me/923001234567" target="_blank" rel="noreferrer">
            <MessageCircle size={18} />
            WhatsApp
          </a>
        </div>
      </section>
    </section>
  );
}

export default FAQPage;
