import { BookOpenText, CalendarCheck, Coffee, LogIn, Menu as MenuIcon, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useCustomerAuth } from "../auth/CustomerAuthContext";
import BearCoffeeLogo from "./BearCoffeeLogo";

function Navigation() {
  const [open, setOpen] = useState(false);
  const { user } = useCustomerAuth();

  const close = () => setOpen(false);

  return (
    <header className="topbar">
      <Link to="/" className="brand-mark" onClick={close} aria-label="NOFFELO home">
        <BearCoffeeLogo />
        <span>
          <strong>NOFFELO</strong>
          <small>Cafe & lounge</small>
        </span>
      </Link>

      <button className="icon-button nav-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
        {open ? <X size={20} /> : <MenuIcon size={20} />}
      </button>

      <nav className={open ? "nav-links open" : "nav-links"} aria-label="Primary navigation">
        <NavLink to="/" onClick={close}>Home</NavLink>
        <NavLink to="/menu" onClick={close}>
          <Coffee size={17} />
          Menu
        </NavLink>
        <NavLink to="/our-story" onClick={close}>
          <BookOpenText size={17} />
          Our Story
        </NavLink>
        <NavLink to="/reserve" onClick={close}>
          <CalendarCheck size={17} />
          Reserve
        </NavLink>
        {user ? (
          <NavLink to="/account" onClick={close}>
            <UserRound size={17} />
            Account
          </NavLink>
        ) : (
          <NavLink to="/login" onClick={close}>
            <LogIn size={17} />
            Login
          </NavLink>
        )}
        <NavLink to="/admin/login" onClick={close}>
          <ShieldCheck size={17} />
          Admin
        </NavLink>
      </nav>
    </header>
  );
}

export default Navigation;
