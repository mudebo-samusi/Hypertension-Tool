import React from "react";
import  { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        <Link className="navbar-brand" to="/">Hypertension Management</Link>
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav ms-auto">
            {!user ? (
              <>
                <li className="nav-item"><Link className="nav-link" to="/login">Login</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/register">Register</Link></li>
              </>
            ) : (
              <>
                <li className="nav-item"><Link className="nav-link" to="/profile">Profile</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/history">History</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/charts">BP Charts</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/recommendations">Recommendations</Link></li>
                <li className="nav-item"><button className="btn btn-danger" onClick={logout}>Logout</button></li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
