import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">LS Tier List</Link>
      </div>
      <nav className="nav">
        <ul>
          <li><Link to="/top">Top</Link></li>
          <li><Link to="/jungle">Jungle</Link></li>
          <li><Link to="/mid">Mid</Link></li>
          <li><Link to="/adc">ADC</Link></li>
          <li><Link to="/support">Support</Link></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header; 