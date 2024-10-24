// src/components/Sidebar/Sidebar.js
import React, { useState } from 'react';
import { Package, Home, DollarSign, Users, CalendarIcon, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import '../assets/styles/Sidebar.css';

/**
 * Sidebar Component
 * Provides navigation and section management for the admin dashboard
 * 
 * @param {Object} props
 * @param {Function} props.onSectionChange - Callback to handle section changes
 * @param {Function} props.onLogout - Callback to handle logout
 * @param {string} props.currentSection - Currently active section
 */
const Sidebar = ({ onSectionChange, onLogout, currentSection = 'dashboard' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Define navigation items
  const menuItems = [
    { id: 'dashboard', icon: <Home className="h-5 w-5" />, label: 'Dashboard' },
    { id: 'sales', icon: <DollarSign className="h-5 w-5" />, label: 'Sales' },
    { id: 'users', icon: <Users className="h-5 w-5" />, label: 'Users' },
    { id: 'raffles', icon: <Package className="h-5 w-5" />, label: 'Raffles' },
    { id: 'active-raffles', icon: <CalendarIcon className="h-5 w-5" />, label: 'Active Raffles' }
  ];

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
    >
      <div className="flex h-full flex-col">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : ""}`}>
            <Package className="h-6 w-6" />
            {!isCollapsed && <span className="ml-2 text-lg font-bold">RifasCAI Admin</span>}
          </div>
          
          <button
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-2 p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${isCollapsed ? "justify-center" : "justify-start"} 
                ${currentSection === item.id ? "active" : ""}`}
              onClick={() => onSectionChange(item.id)}
            >
              {item.icon}
              {!isCollapsed && <span className="ml-2">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="mt-auto p-4">
          <button
            className={`logout-item ${isCollapsed ? "justify-center" : "justify-start"}`}
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;