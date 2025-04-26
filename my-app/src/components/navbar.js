// Navbar (components/Navbar.js)
import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""}`}>🏠 Dashboard</Link>
      <span className="nav-space"></span>
      <Link to="/reports" className={`nav-link ${location.pathname === "/reports" ? "active" : ""}`}>📊 Reports</Link>
    </nav>
  );
};

export default Navbar;