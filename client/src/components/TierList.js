import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChampionCard from './ChampionCard';
import './TierList.css';

const TierList = ({ role, userCookie, onVote }) => {
  const [champions, setChampions] = useState([]);
  const [userVotes, setUserVotes] = useState({});
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

  // Fetch champions and user's votes for this role
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch champions for this role
        const championsResponse = await axios.get(`/api/tiers/${role}`);
        setChampions(championsResponse.data);
        
        // Fetch user's votes if userCookie exists
        if (userCookie) {
          try {
            const votesResponse = await axios.get(`/api/user-votes/${role}?user_cookie=${userCookie}`);
            setUserVotes(votesResponse.data);
          } catch (votesError) {
            console.error(`Error fetching user votes:`, votesError);
            // Continue anyway - we'll just show no votes
          }
        }
        
        setLoading(false);
      } catch (err) {
        setError(`Failed to fetch ${role} champions. Please try again later.`);
        setLoading(false);
        console.error(`Error fetching ${role} champions:`, err);
      }
    };

    fetchData();
  }, [role, userCookie]);

  // Custom vote handler that updates local state
  const handleVoteWithState = async (championId, role, voteValue) => {
    try {
      await onVote(championId, role, voteValue);
      
      // Update local state of user votes
      if (voteValue === 0) {
        const newUserVotes = {...userVotes};
        delete newUserVotes[championId];
        setUserVotes(newUserVotes);
      } else {
        setUserVotes(prev => ({
          ...prev,
          [championId]: voteValue
        }));
      }
      
      // Fetch updated tier list
      const response = await axios.get(`/api/tiers/${role}`);
      setChampions(response.data);
    } catch (err) {
      console.error('Error handling vote:', err);
    }
  };

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
                  userVote={userVotes[champion.id] || null}
                  onVote={handleVoteWithState}
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