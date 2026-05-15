import { ArrowRight, CircleHelp, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { faqItems } from "../data/faqs";

function FAQSection({
  compact = false,
  limit,
  showHeader = true,
  title = "Questions before you visit?",
  intro = "Quick answers about timings, reservations, online ordering, and guest support.",
  actionTo,
  actionLabel = "View all FAQs"
}) {
  const items = typeof limit === "number" ? faqItems.slice(0, limit) : faqItems;

  return (
    <section className={compact ? "faq-section compact" : "faq-section"} id="faq">
      {showHeader ? (
        <div className="section-heading faq-heading">
          <div>
            <span className="section-kicker">
              <CircleHelp size={17} />
              FAQ
            </span>
            <h2>{title}</h2>
            {intro ? <p>{intro}</p> : null}
          </div>
          {actionTo ? (
            <Link className="button compact-button" to={actionTo}>
              {actionLabel}
              <ArrowRight size={16} />
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="faq-list">
        {items.map((item) => (
          <details className="faq-item" key={item.question}>
            <summary>
              <span>{item.question}</span>
              <Plus size={18} aria-hidden="true" />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default FAQSection;
