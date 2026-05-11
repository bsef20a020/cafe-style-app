import { ArrowRight, CalendarCheck, Coffee, HeartHandshake, Leaf, MapPin, Moon, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const principles = [
  {
    icon: Coffee,
    title: "Coffee With Intention",
    copy: "A focused menu built around dependable espresso, slow coffee, cold signatures, and desserts that feel considered."
  },
  {
    icon: Moon,
    title: "Evening Lounge Calm",
    copy: "As the day settles, the room shifts into a softer rhythm for conversations, small celebrations, and unhurried tables."
  },
  {
    icon: HeartHandshake,
    title: "Service That Remembers",
    copy: "Reservations, preferences, and guest notes are treated as part of the experience, not admin afterthoughts."
  }
];

function OurStoryPage() {
  return (
    <div className="story-page">
      <section className="story-hero">
        <div className="story-hero-copy">
          <span className="section-kicker">
            <Sparkles size={17} />
            Our story
          </span>
          <h1>Built for the pause between a good coffee and a better conversation.</h1>
          <p>
            NOFFELO is shaped as a modern cafe and evening lounge: warm enough for everyday visits, polished enough for
            planned tables, and calm enough to make guests want to stay.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/reserve">
              <CalendarCheck size={18} />
              Reserve a table
            </Link>
            <Link className="button ghost" to="/menu">
              Explore menu
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="story-hero-facts" aria-label="NOFFELO experience highlights">
            <div>
              <strong>09:00-23:00</strong>
              <span>Daily rhythm</span>
            </div>
            <div>
              <strong>Cafe + Lounge</strong>
              <span>One connected mood</span>
            </div>
            <div>
              <strong>Lahore</strong>
              <span>Warm local pace</span>
            </div>
          </div>
        </div>

        <div className="story-hero-media">
          <img
            src="https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=1800&q=80"
            alt="Cafe table with coffee and warm interior light"
          />
          <div className="story-media-note">
            <MapPin size={18} />
            <span>Cafe by day · Lounge by evening</span>
          </div>
        </div>
      </section>

      <section className="story-origin">
        <div>
          <span className="section-kicker">
            <Leaf size={17} />
            Why NOFFELO exists
          </span>
          <h2>A place designed around mood, timing, and service that feels remembered.</h2>
        </div>
        <p>
          The idea is simple: a guest should be able to walk in for coffee, return for dessert, and book a table for an
          evening without the place feeling like three different brands. NOFFELO keeps those moments connected through a
          refined menu, a measured atmosphere, and a service rhythm that respects both quick visits and long stays.
        </p>
      </section>

      <section className="story-split">
        <div className="story-panel warm">
          <span>By Day</span>
          <h2>Coffee, bakery, and work-friendly calm.</h2>
          <p>
            Morning and afternoon service should feel bright, reliable, and easy to choose. The menu leads with signatures,
            guest favorites, and polished basics that make repeat visits natural.
          </p>
        </div>
        <div className="story-panel dark">
          <span>By Evening</span>
          <h2>Soft lounge energy without losing the cafe soul.</h2>
          <p>
            Evening tables lean into richer drinks, desserts, warmer lighting, and reservations that help the team prepare
            before the guest arrives.
          </p>
        </div>
      </section>

      <section className="story-principles">
        <div className="section-heading">
          <div>
            <span className="section-kicker">What guides us</span>
            <h2>The experience is built from small, deliberate choices.</h2>
          </div>
        </div>

        <div className="principle-grid">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <article className="principle-card" key={principle.title}>
                <Icon size={24} />
                <h3>{principle.title}</h3>
                <p>{principle.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="story-cta">
        <span className="section-kicker">Visit NOFFELO</span>
        <h2>Come for the coffee. Stay for the pace.</h2>
        <div className="hero-actions">
          <Link className="button primary" to="/reserve">
            <CalendarCheck size={18} />
            Reserve a table
          </Link>
          <Link className="button ghost" to="/menu">
            View menu
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}

export default OurStoryPage;
