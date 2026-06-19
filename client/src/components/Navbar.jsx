import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function getInitials(name = '') {
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">TASKIFY</span>

        <nav className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Tasks</NavLink>
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>
        </nav>

        <div className="navbar-user">
          <NavLink to="/profile" className="navbar-avatar-link" aria-label="Your profile">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="navbar-avatar-img" />
            ) : (
              <span className="navbar-avatar-initials">{getInitials(user?.name)}</span>
            )}
          </NavLink>
          <span className="navbar-username">Hi, {user?.name?.split(' ')[0]}</span>
          <button className="ghost-button" type="button" onClick={handleLogout}>Log out</button>
        </div>
      </div>
    </header>
  );
}