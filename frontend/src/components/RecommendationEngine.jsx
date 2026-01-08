import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/RecommendationEngine.css';

function RecommendationEngine({ user, userRole }) {
  const [recommendations, setRecommendations] = useState({
    mentors: [],
    events: [],
    jobs: [],
    alumni: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('mentors');

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user, userRole]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      // Load different recommendations based on user role
      const promises = [];

      if (userRole === 'student' || userRole === 'alumni') {
        // Get mentor recommendations
        promises.push(apiService.getMentorRecommendations(user.id));
        
        // Get event recommendations
        promises.push(apiService.getEventRecommendations(user.id));
      }

      if (userRole === 'alumni') {
        // Get job recommendations
        promises.push(apiService.getJobRecommendations(user.id));
        
        // Get alumni recommendations for networking
        promises.push(apiService.getAlumniRecommendations(user.id));
      }

      const results = await Promise.all(promises);
      
      const newRecommendations = {
        mentors: results[0]?.mentors || [],
        events: results[1]?.events || [],
        jobs: results[2]?.jobs || [],
        alumni: results[3]?.alumni || []
      };

      setRecommendations(newRecommendations);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationScore = (item) => {
    // Calculate recommendation score based on various factors
    let score = 0;
    
    if (item.match_reasons) {
      score += item.match_reasons.length * 20;
    }
    
    if (item.similarity_score) {
      score += item.similarity_score * 30;
    }
    
    if (item.popularity_score) {
      score += item.popularity_score * 20;
    }
    
    return Math.min(100, Math.max(0, score));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
  };

  if (!user) {
    return <div className="recommendation-engine">Please log in to see recommendations.</div>;
  }

  if (loading) {
    return (
      <div className="recommendation-engine">
        <div className="loading-state">
          <div className="loading-spinner">🔍</div>
          <h3>Finding Recommendations...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendation-engine">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>Error Loading Recommendations</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadRecommendations}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasRecommendations = Object.values(recommendations).some(arr => arr.length > 0);

  if (!hasRecommendations) {
    return (
      <div className="recommendation-engine">
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h3>No Recommendations Yet</h3>
          <p>Complete your profile to get personalized recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendation-engine">
      <div className="recommendation-header">
        <h3>Personalized Recommendations</h3>
        <p>Based on your profile and preferences</p>
      </div>

      <div className="recommendation-tabs">
        {recommendations.mentors.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'mentors' ? 'active' : ''}`}
            onClick={() => setActiveTab('mentors')}
          >
            🤝 Mentors ({recommendations.mentors.length})
          </button>
        )}
        {recommendations.events.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            📅 Events ({recommendations.events.length})
          </button>
        )}
        {recommendations.jobs.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            💼 Jobs ({recommendations.jobs.length})
          </button>
        )}
        {recommendations.alumni.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'alumni' ? 'active' : ''}`}
            onClick={() => setActiveTab('alumni')}
          >
            👥 Alumni ({recommendations.alumni.length})
          </button>
        )}
      </div>

      <div className="recommendation-content">
        {activeTab === 'mentors' && recommendations.mentors.length > 0 && (
          <div className="recommendation-list">
            {recommendations.mentors.map(mentor => {
              const score = getRecommendationScore(mentor);
              return (
                <div key={mentor.id} className="recommendation-card">
                  <div className="recommendation-header-card">
                    <div className="recommendation-info">
                      <h4>{mentor.name}</h4>
                      <p className="recommendation-company">{mentor.company}</p>
                      <p className="recommendation-designation">{mentor.designation}</p>
                    </div>
                    <div className="recommendation-score">
                      <div className={`score-badge ${getScoreColor(score)}`}>
                        {score}%
                      </div>
                      <div className="score-label">{getScoreLabel(score)}</div>
                    </div>
                  </div>
                  {mentor.match_reasons && mentor.match_reasons.length > 0 && (
                    <div className="match-reasons">
                      <h5>Why this match:</h5>
                      <ul>
                        {mentor.match_reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="recommendation-actions">
                    <button className="btn btn-primary">Connect</button>
                    <button className="btn btn-secondary">View Profile</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'events' && recommendations.events.length > 0 && (
          <div className="recommendation-list">
            {recommendations.events.map(event => {
              const score = getRecommendationScore(event);
              return (
                <div key={event.id} className="recommendation-card">
                  <div className="recommendation-header-card">
                    <div className="recommendation-info">
                      <h4>{event.title}</h4>
                      <p className="recommendation-date">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                      <p className="recommendation-location">{event.location}</p>
                    </div>
                    <div className="recommendation-score">
                      <div className={`score-badge ${getScoreColor(score)}`}>
                        {score}%
                      </div>
                      <div className="score-label">{getScoreLabel(score)}</div>
                    </div>
                  </div>
                  {event.match_reasons && event.match_reasons.length > 0 && (
                    <div className="match-reasons">
                      <h5>Why this match:</h5>
                      <ul>
                        {event.match_reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="recommendation-actions">
                    <button className="btn btn-primary">RSVP</button>
                    <button className="btn btn-secondary">View Details</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'jobs' && recommendations.jobs.length > 0 && (
          <div className="recommendation-list">
            {recommendations.jobs.map(job => {
              const score = getRecommendationScore(job);
              return (
                <div key={job.id} className="recommendation-card">
                  <div className="recommendation-header-card">
                    <div className="recommendation-info">
                      <h4>{job.title}</h4>
                      <p className="recommendation-company">{job.company}</p>
                      <p className="recommendation-location">{job.location}</p>
                      {job.salary_range && (
                        <p className="recommendation-salary">{job.salary_range}</p>
                      )}
                    </div>
                    <div className="recommendation-score">
                      <div className={`score-badge ${getScoreColor(score)}`}>
                        {score}%
                      </div>
                      <div className="score-label">{getScoreLabel(score)}</div>
                    </div>
                  </div>
                  {job.match_reasons && job.match_reasons.length > 0 && (
                    <div className="match-reasons">
                      <h5>Why this match:</h5>
                      <ul>
                        {job.match_reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="recommendation-actions">
                    <button className="btn btn-primary">Apply</button>
                    <button className="btn btn-secondary">View Details</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'alumni' && recommendations.alumni.length > 0 && (
          <div className="recommendation-list">
            {recommendations.alumni.map(alumnus => {
              const score = getRecommendationScore(alumnus);
              return (
                <div key={alumnus.id} className="recommendation-card">
                  <div className="recommendation-header-card">
                    <div className="recommendation-info">
                      <h4>{alumnus.name}</h4>
                      <p className="recommendation-company">{alumnus.company}</p>
                      <p className="recommendation-designation">{alumnus.designation}</p>
                      <p className="recommendation-department">{alumnus.department}</p>
                    </div>
                    <div className="recommendation-score">
                      <div className={`score-badge ${getScoreColor(score)}`}>
                        {score}%
                      </div>
                      <div className="score-label">{getScoreLabel(score)}</div>
                    </div>
                  </div>
                  {alumnus.match_reasons && alumnus.match_reasons.length > 0 && (
                    <div className="match-reasons">
                      <h5>Why this match:</h5>
                      <ul>
                        {alumnus.match_reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="recommendation-actions">
                    <button className="btn btn-primary">Connect</button>
                    <button className="btn btn-secondary">View Profile</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationEngine;
