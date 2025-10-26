// InteractionDebug.js - Debug component to test interactions
import React, { useState } from 'react';
import interactionService from '../services/interactionService';
import { useAuth } from '../context/AuthContext';

const InteractionDebug = () => {
  const { isAuthenticated } = useAuth();
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Use a known issue ID from our seeded data
  const testIssueId = '68fdcbd2195fe42433c0d734';

  const testEndpoint = async (name, testFn) => {
    setLoading(true);
    try {
      const result = await testFn();
      setResults(prev => ({
        ...prev,
        [name]: { success: true, data: result }
      }));
      console.log(`✅ ${name}:`, result);
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [name]: { success: false, error: error.message }
      }));
      console.error(`❌ ${name}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    if (!isAuthenticated) {
      alert('Please login first to test interactions');
      return;
    }

    setResults({});
    
    // Test vote status
    await testEndpoint('Vote Status', () => 
      interactionService.getVoteStatus(testIssueId)
    );
    
    // Test follow status
    await testEndpoint('Follow Status', () => 
      interactionService.getFollowStatus(testIssueId)
    );
    
    // Test comments
    await testEndpoint('Comments', () => 
      interactionService.getComments(testIssueId)
    );
    
    // Test vote (will toggle)
    await testEndpoint('Vote Toggle', () => 
      interactionService.voteOnIssue(testIssueId, 'upvote')
    );
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      padding: '20px', 
      border: '2px solid #ccc',
      borderRadius: '8px',
      zIndex: 9999,
      maxWidth: '400px',
      maxHeight: '500px',
      overflow: 'auto'
    }}>
      <h3>🐛 Interaction Debug</h3>
      <p>Testing Issue ID: {testIssueId}</p>
      
      <button 
        onClick={runTests} 
        disabled={loading || !isAuthenticated}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '15px'
        }}
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>
      
      {!isAuthenticated && (
        <p style={{ color: 'red' }}>❌ Not authenticated</p>
      )}
      
      <div style={{ fontSize: '12px' }}>
        {Object.entries(results).map(([name, result]) => (
          <div key={name} style={{ marginBottom: '10px', padding: '8px', background: '#f5f5f5' }}>
            <strong>{name}:</strong>
            {result.success ? (
              <span style={{ color: 'green' }}>
                ✅ Success - {JSON.stringify(result.data, null, 2).slice(0, 100)}...
              </span>
            ) : (
              <span style={{ color: 'red' }}>
                ❌ Error: {result.error}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractionDebug;