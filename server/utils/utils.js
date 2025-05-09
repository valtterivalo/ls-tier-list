/**
 * Apply Bayesian adjustment to vote scores
 * This helps balance champions with few votes against those with many
 * 
 * @param {Array} champions - Array of champion objects with upvotes and downvotes
 * @param {number} [k=10] - Adjustment factor (higher = more conservative)
 * @param {number} [threshold=10] - Minimum votes required before considering raw score
 * @returns {Array} Champions with adjusted scores
 */
const applyBayesianAdjustment = (champions, k = 10, threshold = 10) => {
  // Calculate the global average score
  let totalUpvotes = 0;
  let totalVotes = 0;
  
  champions.forEach(champion => {
    const upvotes = champion.upvotes || 0;
    const downvotes = champion.downvotes || 0;
    totalUpvotes += upvotes;
    totalVotes += upvotes + downvotes;
  });
  
  // Global average score (default to 0.5 if no votes)
  const avgGlobalScore = totalVotes > 0 ? totalUpvotes / totalVotes : 0.5;
  
  // Apply adjustment to each champion
  return champions.map(champion => {
    const upvotes = champion.upvotes || 0;
    const downvotes = champion.downvotes || 0;
    const totalVotes = upvotes + downvotes;
    
    let score;
    if (totalVotes === 0) {
      // No votes, use global average
      score = avgGlobalScore;
    } else if (totalVotes < threshold) {
      // Few votes, apply Bayesian adjustment
      score = (upvotes + k * avgGlobalScore) / (totalVotes + k);
    } else {
      // Enough votes, use raw score
      score = upvotes / totalVotes;
    }
    
    return {
      ...champion,
      adjustedScore: score,
      totalVotes // Add totalVotes to the champion object for tier assignment logic
    };
  });
};

/**
 * Normalize a list of champions into tier groups based on percentages
 * 
 * @param {Array} champions - Array of champion objects with adjustedScore
 * @returns {Array} Champions with tier assignments
 */
const assignTiersToChampions = (champions) => {
  // Sort champions by adjusted score (highest first)
  const sortedChampions = [...champions].sort((a, b) => 
    b.adjustedScore - a.adjustedScore
  );
  
  // Check if there's enough voting activity to apply percentage-based tiers
  // Calculate total votes across all champions
  const totalVotesAcrossAllChampions = sortedChampions.reduce((sum, champ) => 
    sum + (champ.totalVotes || 0), 0);
  
  // If there's minimal voting activity, place champions in B and C tiers only
  if (totalVotesAcrossAllChampions < sortedChampions.length * 3) { // Threshold: avg 3 votes per champion
    // Split champions roughly in half between B and C tiers
    const totalChampions = sortedChampions.length;
    const halfIndex = Math.floor(totalChampions / 2);
    
    return sortedChampions.map((champion, index) => {
      // First half goes to B tier, second half to C tier
      const tier = index < halfIndex ? 'B' : 'C';
      return { ...champion, tier };
    });
  }
  
  // Define tier percentages for normal assignment
  const tierPercentages = {
    'God': 0.01,  // Top 1%
    'S': 0.08,    // Next 8% (increased from 4%)
    'A': 0.15,    // Next 15%
    'B': 0.18,    // Next 18% (reduced from 20%)
    'C': 0.18,    // Next 18% (reduced from 20%)
    'D': 0.15,    // Next 15%
    'F': 0.04,    // Next 4%
    'Shit': 0.01  // Bottom 1%
  };
  
  // Calculate counts for each tier
  const totalChampions = sortedChampions.length;
  const tierCounts = {};
  let accumulatedCount = 0;
  
  // First, get raw counts based on percentages
  for (const [tier, percentage] of Object.entries(tierPercentages)) {
    // Calculate the count and round up to nearest integer
    const count = Math.max(1, Math.ceil(totalChampions * percentage));
    tierCounts[tier] = count;
    accumulatedCount += count;
  }
  
  // Handle overflow if the total exceeds champion count
  if (accumulatedCount > totalChampions) {
    const excess = accumulatedCount - totalChampions;
    
    // Reduce middle tiers first (B, C)
    const adjustmentOrder = ['B', 'C', 'A', 'D', 'S', 'F', 'God', 'Shit'];
    let remaining = excess;
    let i = 0;
    
    while (remaining > 0 && i < adjustmentOrder.length) {
      const tier = adjustmentOrder[i];
      if (tierCounts[tier] > 1) {
        tierCounts[tier]--;
        remaining--;
      } else {
        i++;
      }
    }
  }
  
  // Assign tiers to champions
  let startIndex = 0;
  const tieredChampions = [];
  
  for (const tier of ['God', 'S', 'A', 'B', 'C', 'D', 'F', 'Shit']) {
    const count = tierCounts[tier];
    const championsInTier = sortedChampions.slice(startIndex, startIndex + count);
    
    championsInTier.forEach(champion => {
      tieredChampions.push({
        ...champion,
        tier
      });
    });
    
    startIndex += count;
    if (startIndex >= totalChampions) break;
  }
  
  return tieredChampions;
};

module.exports = {
  applyBayesianAdjustment,
  assignTiersToChampions
}; 