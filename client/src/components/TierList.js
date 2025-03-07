import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChampionCard from './ChampionCard';
import './TierList.css';

const TierList = ({ role, userCookie, onVote }) => {
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define tier colors
  const tierColors = {
    'God': '#FF4500', // Orange Red
    'S': '#FF8C00', // Dark Orange
    'A': '#FFD700', // Gold
    'B': '#32CD32', // Lime Green
    'C': '#1E90FF', // Dodger Blue
    'D': '#9370DB', // Medium Purple
    'F': '#8B0000', // Dark Red
    'Shit': '#000000' // Black
  };

  // Fetch champions for this role
  useEffect(() => {
    const fetchChampionsByRole = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/tiers/${role}`);
        setChampions(response.data);
        setLoading(false);
      } catch (err) {
        setError(`Failed to fetch ${role} champions. Please try again later.`);
        setLoading(false);
        console.error(`Error fetching ${role} champions:`, err);
      }
    };

    fetchChampionsByRole();
  }, [role]);

  // Group champions by tier
  const championsByTier = champions.reduce((acc, champion) => {
    if (!acc[champion.tier]) {
      acc[champion.tier] = [];
    }
    acc[champion.tier].push(champion);
    return acc;
  }, {});

  // Order of tiers from highest to lowest
  const tierOrder = ['God', 'S', 'A', 'B', 'C', 'D', 'F', 'Shit'];

  if (loading) {
    return <div className="loading">Loading {role} tier list...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="tier-list-container">
      <h1>{role} Tier List</h1>
      
      {tierOrder.map(tier => {
        // Skip tiers with no champions
        if (!championsByTier[tier] || championsByTier[tier].length === 0) {
          return null;
        }
        
        return (
          <div 
            key={tier} 
            className="tier-row"
            style={{ backgroundColor: `${tierColors[tier]}20` }} // 20 is hex for 12% opacity
          >
            <div 
              className="tier-label"
              style={{ backgroundColor: tierColors[tier] }}
            >
              {tier}
            </div>
            <div className="champions-container">
              {championsByTier[tier].map(champion => (
                <ChampionCard 
                  key={`${champion.id}-${role}`}
                  champion={champion}
                  role={role}
                  onVote={onVote}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TierList; 