import React, { useState } from 'react';
import './ChampionCard.css';

const ChampionCard = ({ champion, role, userVote, onVote }) => {
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteValue) => {
    // Prevent multiple votes while processing
    if (isVoting) return;
    
    // If user clicks the same vote button again, treat as removing vote
    const newVoteValue = userVote === voteValue ? 0 : voteValue;
    
    setIsVoting(true);
    try {
      await onVote(champion.id, role, newVoteValue);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  // Calculate total votes
  const totalVotes = (champion.upvotes || 0) + (champion.downvotes || 0);

  return (
    <div className="champion-card">
      <div className="champion-portrait">
        <img src={champion.portrait_url} alt={champion.name} />
      </div>
      <div className="champion-info">
        <h3>{champion.name}</h3>
        <div className="vote-count">{totalVotes} votes</div>
      </div>
      <div className="vote-buttons">
        <button 
          className={`upvote ${userVote === 1 ? 'active' : ''}`}
          onClick={() => handleVote(1)}
          disabled={isVoting}
        >
          ▲
        </button>
        <button 
          className={`downvote ${userVote === -1 ? 'active' : ''}`}
          onClick={() => handleVote(-1)}
          disabled={isVoting}
        >
          ▼
        </button>
      </div>
    </div>
  );
};

export default ChampionCard; 