import { Link, useLocation } from "react-router-dom";

export default function PublicNavbar() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <nav className="navbar" id="public-navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          VFX <span className="accent">Seal</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className={isActive("/") ? "active" : ""}>
            Home
          </Link>
          <Link to="/vendors" className={isActive("/vendors") ? "active" : ""}>
            Vendor Directory
          </Link>
          <Link to="/contact" className={isActive("/contact") ? "active" : ""}>
            Contact
          </Link>
        </div>

        <div className="navbar-actions-public">
          <Link to="/login" className="btn btn-outline btn-sm">
            Sign In
          </Link>
          {"  "}
          <Link to="/register" className="btn btn-primary btn-sm">
            Join the Club
          </Link>
        </div>
      </div>
    </nav>
  );
}
