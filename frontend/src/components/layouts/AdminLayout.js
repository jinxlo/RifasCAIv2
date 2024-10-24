import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  Package, 
  Home, 
  DollarSign, 
  Plus,
  Calendar,
  LogOut
} from 'lucide-react';
import '../../assets/styles/adminSections/AdminLayout.css';

const AdminLayout = ({ onLogout }) => {
  const [isCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { 
      path: '/admin/dashboard', 
      icon: <Home size={20} />, 
      label: 'Dashboard',
      color: 'purple'  // Custom color for active state
    },
    { 
      path: '/admin/pending-payments', 
      icon: <DollarSign size={20} />, 
      label: 'Pagos Pendientes' 
    },
    { 
      path: '/admin/create-raffle', 
      icon: <Plus size={20} />, 
      label: 'Nueva Rifa' 
    },
    { 
      path: '/admin/active-raffles', 
      icon: <Calendar size={20} />, 
      label: 'Rifas Activas' 
    }
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="admin-layout">
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'visible' : ''}`}>
        <div className="logo-container">
          <Package className="nav-item-icon" />
          {!isCollapsed && <span>Admin Panel</span>}
        </div>

        <nav className="nav-section">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
              style={isActive(item.path) && item.color ? { backgroundColor: `var(--${item.color})` } : {}}
            >
              {item.icon}
              {!isCollapsed && <span className="nav-item-text">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="user-menu">
          <button 
            className="user-menu-button"
            onClick={onLogout}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="nav-item-text">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <main className={`main-content ${isCollapsed ? 'expanded' : ''}`}>
        {/* Render the child route components */}
        <Outlet />
      </main>

      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
