import React from 'react';
import { useNavigate } from 'react-router-dom';
import RaffleCard from '../components/RaffleCard';
import Header from '../components/Header'; // Import the Header component
import '../assets/styles/HomePage.css'; // Import the updated CSS

const HomePage = () => {
  const navigate = useNavigate();

  const handleBuyTickets = (quantity) => {
    navigate('/select-numbers');
  };

  return (
    <main className="homepage">
      {/* Use the Header component */}
      <Header />

      {/* Raffle Card Section */}
      <div className="home-container">
        <RaffleCard onBuyTickets={handleBuyTickets} />
      </div>

      {/* Footer Section */}
      <footer className="footer">
        &copy; {new Date().getFullYear()} RifasCAI. All rights reserved.
      </footer>
    </main>
  );
};

export default HomePage;
