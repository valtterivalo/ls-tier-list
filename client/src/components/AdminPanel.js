import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const AdminPanel = () => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [resetPercentage, setResetPercentage] = useState(50);
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [champions, setChampions] = useState([]);
  const [selectedChampion, setSelectedChampion] = useState('');
  const [updateStats, setUpdateStats] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [tierVerification, setTierVerification] = useState(null);
  
  // Testing settings
  const [voteSimSettings, setVoteSimSettings] = useState({
    count: 500,
    roleFilter: '',
    biasedChampions: ''
  });
  
  const [selectedRole, setSelectedRole] = useState('Top');
  
  const [roles, setRoles] = useState({
    Top: false,
    Jungle: false,
    Mid: false,
    ADC: false,
    Support: false
  });

  // Fetch champions and snapshots when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchChampions();
      fetchSnapshots();
    }
  }, [authenticated]);

  const fetchChampions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/champions');
      setChampions(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch champions data.');
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/snapshots', {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      setSnapshots(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch snapshots.');
      setLoading(false);
    }
  };

  const handleAuthentication = (e) => {
    e.preventDefault();
    // Simple client-side authentication for MVP
    // In a real app, this would be a server request
    if (password) {
      setAuthenticated(true);
    } else {
      setError('Password is required');
    }
  };

  const handleSoftReset = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/soft-reset', {
        percentage: resetPercentage,
        password
      });
      setMessage(response.data.message);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply soft reset');
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/snapshots', {
        name: `manual-${new Date().toISOString()}`,
        password
      });
      setMessage(response.data.message);
      fetchSnapshots();
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create snapshot');
      setLoading(false);
    }
  };

  const handleRestoreSnapshot = async () => {
    if (!selectedSnapshot) {
      setError('Please select a snapshot to restore');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/admin/restore', {
        snapshot_id: selectedSnapshot,
        password
      });
      setMessage(response.data.message);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to restore snapshot');
      setLoading(false);
    }
  };

  const handleChampionSelect = (e) => {
    const championId = e.target.value;
    setSelectedChampion(championId);
    
    if (championId) {
      const champion = champions.find(c => c.id.toString() === championId);
      if (champion) {
        const championRoles = champion.roles.split(',');
        const newRoles = {
          Top: championRoles.includes('Top'),
          Jungle: championRoles.includes('Jungle'),
          Mid: championRoles.includes('Mid'),
          ADC: championRoles.includes('ADC'),
          Support: championRoles.includes('Support')
        };
        setRoles(newRoles);
      }
    } else {
      setRoles({
        Top: false,
        Jungle: false,
        Mid: false,
        ADC: false,
        Support: false
      });
    }
  };

  const handleRoleChange = (role) => {
    setRoles(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };

  const handleUpdateRoles = async () => {
    if (!selectedChampion) {
      setError('Please select a champion');
      return;
    }

    const selectedRoles = Object.entries(roles)
      .filter(([_, isSelected]) => isSelected)
      .map(([role]) => role);

    if (selectedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(`/api/admin/champions/${selectedChampion}/roles`, {
        roles: selectedRoles,
        password
      });
      setMessage(response.data.message);
      fetchChampions();
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update champion roles');
      setLoading(false);
    }
  };

  const handleUpdateChampionRoles = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');
      setUpdateStats(null);

      const response = await axios.post('/api/admin/update-champion-roles', { password });
      
      // Update the local champions state with fresh data
      const updatedChampionsResponse = await axios.get('/api/champions');
      setChampions(updatedChampionsResponse.data);
      
      // Reset selected champion if it was modified
      if (selectedChampion) {
        const updatedChampion = updatedChampionsResponse.data.find(
          c => c.id === parseInt(selectedChampion)
        );
        
        if (updatedChampion) {
          // Update roles display
          const champRoles = updatedChampion.roles.split(',');
          setRoles({
            Top: champRoles.includes('Top'),
            Jungle: champRoles.includes('Jungle'),
            Mid: champRoles.includes('Mid'),
            ADC: champRoles.includes('ADC'),
            Support: champRoles.includes('Support')
          });
        }
      }
      
      setMessage(
        `${response.data.message}. ` + 
        `${response.data.stats.updated} champions updated, ` +
        `${response.data.stats.added} new champions added, ` +
        `${response.data.stats.removed} champions had roles removed.`
      );
      setUpdateStats(response.data.stats);
      
    } catch (err) {
      console.error('Update champion roles error:', err);
      setError(err.response?.data?.error || 'Failed to update champion roles from JSON file');
    } finally {
      setLoading(false);
    }
  };
  
  // Add vote simulation function
  const handleSimulateVotes = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('');
      setError('');
      setTestResults(null);
      
      // Parse bias champions into an array
      const bias = voteSimSettings.biasedChampions
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      const response = await axios.post('/api/admin/simulate-votes', {
        password,
        count: parseInt(voteSimSettings.count),
        roleFilter: voteSimSettings.roleFilter || undefined,
        bias: bias.length > 0 ? bias : undefined
      });
      
      setMessage(`Successfully simulated ${response.data.stats.total} votes (${response.data.stats.upvotes} upvotes, ${response.data.stats.downvotes} downvotes)`);
      setTestResults(response.data.stats);
      
    } catch (err) {
      console.error('Vote simulation error:', err);
      setError(err.response?.data?.error || 'Failed to simulate votes');
    } finally {
      setLoading(false);
    }
  };
  
  // Add tier verification function
  const handleVerifyTiers = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');
      setTierVerification(null);
      
      const response = await axios.get(`/api/admin/verify-tiers?password=${password}&role=${selectedRole}`);
      setTierVerification(response.data);
      
    } catch (err) {
      console.error('Tier verification error:', err);
      setError(err.response?.data?.error || 'Failed to verify tiers');
    } finally {
      setLoading(false);
    }
  };
  
  // Test API health
  const handleHealthCheck = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/health');
      setMessage(`API health: ${response.data.status}. Database has ${response.data.database.champions} champions.`);
    } catch (err) {
      setError('API health check failed');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for debugging
  const debugShowChampionsByRole = (role) => {
    if (!champions || champions.length === 0) return [];
    
    return champions
      .filter(champ => champ.roles.includes(role))
      .map(champ => champ.name)
      .sort();
  };

  // JSX structure with testing section added
  return (
    <div className="admin-panel">
      {!authenticated ? (
        <div className="auth-section">
          <h1>Admin Authentication</h1>
          <form onSubmit={handleAuthentication}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
            <button type="submit">Authenticate</button>
          </form>
        </div>
      ) : (
        <div className="admin-controls">
          <h1>Admin Panel</h1>
          
          {/* Soft Reset Section - Keep this section as is */}
          <section className="admin-section">
            <h2>Soft Reset</h2>
            <p>Reduce all votes by a percentage to rebalance the tier list.</p>
            <form onSubmit={handleSoftReset}>
              <div className="form-group">
                <label>
                  Reduction Percentage:
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={resetPercentage}
                    onChange={(e) => setResetPercentage(e.target.value)}
                    required
                  />
                </label>
              </div>
              <button type="submit" disabled={loading}>
                Apply Soft Reset
              </button>
            </form>
          </section>
          
          {/* Testing Section - New */}
          <section className="admin-section">
            <h2>Testing Tools</h2>
            <div className="testing-tools">
              <div className="testing-tool">
                <h3>Simulate Votes</h3>
                <p>Generate random votes for testing tier assignments.</p>
                <form onSubmit={handleSimulateVotes}>
                  <div className="form-group">
                    <label>
                      Number of Votes:
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={voteSimSettings.count}
                        onChange={(e) => setVoteSimSettings({
                          ...voteSimSettings,
                          count: e.target.value
                        })}
                        required
                      />
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      Filter by Role (optional):
                      <select
                        value={voteSimSettings.roleFilter}
                        onChange={(e) => setVoteSimSettings({
                          ...voteSimSettings,
                          roleFilter: e.target.value
                        })}
                      >
                        <option value="">All Roles</option>
                        <option value="Top">Top</option>
                        <option value="Jungle">Jungle</option>
                        <option value="Mid">Mid</option>
                        <option value="ADC">ADC</option>
                        <option value="Support">Support</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      Biased Champions (comma-separated, optional):
                      <input
                        type="text"
                        value={voteSimSettings.biasedChampions}
                        onChange={(e) => setVoteSimSettings({
                          ...voteSimSettings,
                          biasedChampions: e.target.value
                        })}
                        placeholder="e.g., Yasuo, Zed, Lee Sin"
                      />
                    </label>
                    <small className="form-help">These champions will receive more votes</small>
                  </div>
                  <button type="submit" disabled={loading}>
                    Generate Random Votes
                  </button>
                </form>
                
                {testResults && (
                  <div className="test-results">
                    <h4>Vote Simulation Results:</h4>
                    <ul>
                      <li>Total votes generated: {testResults.total}</li>
                      <li>Upvotes: {testResults.upvotes} ({Math.round(testResults.upvotes / testResults.total * 100)}%)</li>
                      <li>Downvotes: {testResults.downvotes} ({Math.round(testResults.downvotes / testResults.total * 100)}%)</li>
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="testing-tool">
                <h3>Verify Tier Distribution</h3>
                <p>Check if champions are distributed correctly across tiers based on the voting.</p>
                <div className="form-group">
                  <label>
                    Role to Verify:
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                    >
                      <option value="Top">Top</option>
                      <option value="Jungle">Jungle</option>
                      <option value="Mid">Mid</option>
                      <option value="ADC">ADC</option>
                      <option value="Support">Support</option>
                    </select>
                  </label>
                </div>
                <button 
                  onClick={handleVerifyTiers} 
                  disabled={loading}
                >
                  Verify Tier Distribution
                </button>
                
                {tierVerification && (
                  <div className="tier-verification">
                    <h4>Tier Distribution for {tierVerification.role}:</h4>
                    <p>Total Champions: {tierVerification.championCount}</p>
                    <p>Total Votes: {tierVerification.voteCount}</p>
                    
                    <table className="tier-table">
                      <thead>
                        <tr>
                          <th>Tier</th>
                          <th>Actual</th>
                          <th>Expected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(tierVerification.tierDistribution).map(tier => (
                          <tr key={tier}>
                            <td>{tier}</td>
                            <td>{tierVerification.tierDistribution[tier]}</td>
                            <td>{tierVerification.expectedDistribution[tier]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <details>
                      <summary>Show Champion Details</summary>
                      <div className="champion-details">
                        <table className="champion-table">
                          <thead>
                            <tr>
                              <th>Champion</th>
                              <th>Tier</th>
                              <th>Score</th>
                              <th>Votes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tierVerification.champions.sort((a, b) => 
                              b.adjustedScore - a.adjustedScore
                            ).map(champ => (
                              <tr key={champ.name}>
                                <td>{champ.name}</td>
                                <td>{champ.tier}</td>
                                <td>{champ.adjustedScore.toFixed(3)}</td>
                                <td>{champ.upvotes}/{champ.totalVotes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </div>
                )}
              </div>
              
              <div className="testing-tool">
                <h3>System Health Check</h3>
                <p>Verify that the API and database are functioning correctly.</p>
                <button 
                  onClick={handleHealthCheck} 
                  disabled={loading}
                >
                  Run Health Check
                </button>
              </div>
            </div>
          </section>
          
          {/* Update Champion Roles section */}
          <section className="admin-section">
            <h2>Update Champion Roles</h2>
            <p>Update all champion roles from the champion_roles.json file. This will add new champions, update existing roles, and remove champions from roles they no longer belong to.</p>
            <button 
              onClick={handleUpdateChampionRoles} 
              disabled={loading}
              className="update-roles-btn"
            >
              Update All Champion Roles
            </button>
            
            {updateStats && (
              <div className="update-stats">
                <h3>Update Results:</h3>
                <ul>
                  <li>Champions updated: {updateStats.updated}</li>
                  <li>New champions added: {updateStats.added}</li>
                  <li>Champions removed from roles: {updateStats.removed}</li>
                </ul>
                
                {/* Add debug section */}
                <div className="role-debug">
                  <h4>Champions per role (after update):</h4>
                  <details>
                    <summary>Top Lane ({debugShowChampionsByRole('Top').length} champions)</summary>
                    <div className="champions-list">{debugShowChampionsByRole('Top').join(', ')}</div>
                  </details>
                  <details>
                    <summary>Jungle ({debugShowChampionsByRole('Jungle').length} champions)</summary>
                    <div className="champions-list">{debugShowChampionsByRole('Jungle').join(', ')}</div>
                  </details>
                  <details>
                    <summary>Mid ({debugShowChampionsByRole('Mid').length} champions)</summary>
                    <div className="champions-list">{debugShowChampionsByRole('Mid').join(', ')}</div>
                  </details>
                  <details>
                    <summary>ADC ({debugShowChampionsByRole('ADC').length} champions)</summary>
                    <div className="champions-list">{debugShowChampionsByRole('ADC').join(', ')}</div>
                  </details>
                  <details>
                    <summary>Support ({debugShowChampionsByRole('Support').length} champions)</summary>
                    <div className="champions-list">{debugShowChampionsByRole('Support').join(', ')}</div>
                  </details>
                </div>
              </div>
            )}
          </section>

          {/* Champion Roles Section - Keep this section as is */}
          <section className="admin-section">
            <h2>Champion Roles</h2>
            <div className="form-group">
              <label>
                Select Champion:
                <select
                  value={selectedChampion}
                  onChange={handleChampionSelect}
                  disabled={loading}
                >
                  <option value="">-- Select a champion --</option>
                  {champions.map(champion => (
                    <option key={champion.id} value={champion.id}>
                      {champion.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedChampion && (
              <div className="role-checkboxes">
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={roles.Top}
                      onChange={() => handleRoleChange('Top')}
                    />
                    Top
                  </label>
                </div>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={roles.Jungle}
                      onChange={() => handleRoleChange('Jungle')}
                    />
                    Jungle
                  </label>
                </div>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={roles.Mid}
                      onChange={() => handleRoleChange('Mid')}
                    />
                    Mid
                  </label>
                </div>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={roles.ADC}
                      onChange={() => handleRoleChange('ADC')}
                    />
                    ADC
                  </label>
                </div>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={roles.Support}
                      onChange={() => handleRoleChange('Support')}
                    />
                    Support
                  </label>
                </div>
                <button
                  onClick={handleUpdateRoles}
                  disabled={loading}
                >
                  Update Roles
                </button>
              </div>
            )}
          </section>

          {/* Snapshots Section - Keep this section as is */}
          <section className="admin-section">
            <h2>Snapshots</h2>
            <div className="snapshot-actions">
              <div>
                <button
                  onClick={handleCreateSnapshot}
                  disabled={loading}
                >
                  Create New Snapshot
                </button>
              </div>
              
              <div className="restore-snapshot">
                <select
                  value={selectedSnapshot}
                  onChange={(e) => setSelectedSnapshot(e.target.value)}
                  disabled={loading || snapshots.length === 0}
                >
                  <option value="">-- Select a snapshot --</option>
                  {snapshots.map(snapshot => (
                    <option key={snapshot.id} value={snapshot.id}>
                      {snapshot.name} ({new Date(snapshot.created_at).toLocaleString()})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRestoreSnapshot}
                  disabled={loading || !selectedSnapshot}
                >
                  Restore Selected Snapshot
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default AdminPanel; 