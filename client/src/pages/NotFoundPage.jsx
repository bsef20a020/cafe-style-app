import { Home } from "lucide-react";
import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="not-found">
      <span className="section-kicker">404</span>
      <h1>This table is not on the floor plan.</h1>
      <p>The page you opened does not exist in the new NOFFELO app.</p>
      <Link className="button primary" to="/">
        <Home size={18} />
        Back home
      </Link>
    </section>
  );
}

export default NotFoundPage;
