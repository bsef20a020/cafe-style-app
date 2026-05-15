import { CircleHelp, Instagram, MapPin, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div>
        <div className="footer-brand">NOFFELO</div>
        <p>Craft coffee by day, quiet lounge energy by evening. Built for reservations, service rhythm, and a polished guest experience.</p>
      </div>
      <div className="footer-grid">
        <Link to="/menu">Menu</Link>
        <Link to="/our-story">Our Story</Link>
        <Link to="/faq">
          <CircleHelp size={16} />
          FAQ
        </Link>
        <Link to="/reserve">Reservations</Link>
        <a href="https://maps.google.com/?q=MM+Alam+Road+Lahore" target="_blank" rel="noreferrer">
          <MapPin size={16} />
          Location
        </a>
        <a href="https://wa.me/923001234567" target="_blank" rel="noreferrer">
          <MessageCircle size={16} />
          WhatsApp
        </a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer">
          <Instagram size={16} />
          Social
        </a>
      </div>
    </footer>
  );
}

export default Footer;
