import { ArrowRight, CalendarCheck, Clock, Coffee, ConciergeBell, MapPin, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import MenuCard from "../components/MenuCard";
import ReservationForm from "../components/ReservationForm";
import { fallbackMenu } from "../data/menuFallback";

function HomePage() {
  const [menu, setMenu] = useState({ items: [], loading: true, error: "" });

  useEffect(() => {
    api
      .getMenu()
      .then((data) => setMenu({ items: data.items || [], loading: false, error: "" }))
      .catch(() =>
        setMenu({
          items: fallbackMenu.items,
          loading: false,
          error: "Showing a saved menu while the live menu refreshes."
        })
      );
  }, []);

  const featured = menu.items.filter((item) => item.featured).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={16} />
            Lahore cafe by day, lounge by evening
          </span>
          <h1>NOFFELO</h1>
          <p>
            A polished cafe and evening lounge experience for slow coffee, refined desserts, and reservations that feel effortless.
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
        </div>
        <div className="hero-media" aria-label="NOFFELO cafe atmosphere">
          <img
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1800&q=80"
            alt="Warm cafe interior with tables and lighting"
          />
          <div className="hero-note">
            <Clock size={18} />
            <span>Cafe 9am-9pm · Lounge 6pm-11pm</span>
          </div>
        </div>
      </section>

      <section className="experience-band">
        <div className="experience-item">
          <Coffee size={22} />
          <h2>Signature drinks</h2>
          <p>Menu items are dynamic and ready for admin updates.</p>
        </div>
        <div className="experience-item">
          <ConciergeBell size={22} />
          <h2>Reservation flow</h2>
          <p>Every request is saved with a booking reference.</p>
        </div>
        <div className="experience-item">
          <MapPin size={22} />
          <h2>Local presence</h2>
          <p>Built for a real cafe, not a static landing page.</p>
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              <Coffee size={17} />
              Featured menu
            </span>
            <h2>Built around the items guests ask for first.</h2>
          </div>
          <Link className="button compact-button" to="/menu">
            Full menu
            <ArrowRight size={16} />
          </Link>
        </div>

        {menu.loading ? <p className="muted">Loading menu...</p> : null}
        {menu.error ? <p className="form-error">{menu.error}</p> : null}

        <div className="menu-grid">
          {featured.map((item) => (
            <MenuCard key={item._id} item={item} compact />
          ))}
        </div>
      </section>

      <section className="story-section">
        <div>
          <span className="section-kicker">Our story</span>
          <h2>Coffee by day, quiet lounge energy by evening.</h2>
        </div>
        <p>
          NOFFELO is built for the pace between quick coffee, refined desserts, and tables that turn into longer
          conversations.
          <Link className="text-link" to="/our-story">
            Read the story
            <ArrowRight size={16} />
          </Link>
        </p>
      </section>

      <ReservationForm />
    </>
  );
}

export default HomePage;
