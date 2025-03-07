import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import TierList from './components/TierList';
import AdminPanel from './components/AdminPanel';
import './App.css';

function App() {
  const [userCookie, setUserCookie] = useState('');
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize user cookie for voting
  useEffect(() => {
    // Check if user already has a cookie
    let cookie = localStorage.getItem('user_cookie');
    if (!cookie) {
      // Generate a new UUID
      cookie = uuidv4();
      localStorage.setItem('user_cookie', cookie);
    }
    setUserCookie(cookie);
  }, []);

  // Fetch champions data
  useEffect(() => {
    const fetchChampions = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/champions');
        setChampions(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch champions data. Please try again later.');
        setLoading(false);
        console.error('Error fetching champions:', err);
      }
    };

    fetchChampions();
  }, []);

  // Handle voting
  const handleVote = async (championId, role, voteValue) => {
    try {
      await axios.post('/api/vote', {
        champion_id: championId,
        role: role,
        user_cookie: userCookie,
        vote: voteValue
      });
      
      // Refresh the tier list for the specific role
      // This could be optimized to only update the specific champion
      const response = await axios.get(`/api/tiers/${role}`);
      // Update the champions state with the new data
      // This would need to be implemented based on how you structure your state
    } catch (err) {
      setError('Failed to submit vote. Please try again.');
      console.error('Error voting:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading champions data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<TierList role="Top" userCookie={userCookie} onVote={handleVote} />} />
          <Route path="/top" element={<TierList role="Top" userCookie={userCookie} onVote={handleVote} />} />
          <Route path="/jungle" element={<TierList role="Jungle" userCookie={userCookie} onVote={handleVote} />} />
          <Route path="/mid" element={<TierList role="Mid" userCookie={userCookie} onVote={handleVote} />} />
          <Route path="/adc" element={<TierList role="ADC" userCookie={userCookie} onVote={handleVote} />} />
          <Route path="/support" element={<TierList role="Support" userCookie={userCookie} onVote={handleVote} />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
