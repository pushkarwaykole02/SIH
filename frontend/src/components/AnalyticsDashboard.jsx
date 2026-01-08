import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/AnalyticsDashboard.css';

function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getDashboardAnalytics();
      if (response.success) {
        setAnalytics(response.analytics);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-state">
          <div className="loading-spinner">📊</div>
          <h2>Loading Analytics...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h2>Error Loading Analytics</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadAnalytics}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-dashboard">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>No Analytics Data</h2>
          <p>Analytics data will appear here once the system has some activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="header-content">
          <h1 className="analytics-title">Analytics Dashboard</h1>
          <p className="analytics-subtitle">Comprehensive insights into your AlumniConnect platform</p>
        </div>
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <div className="metric-value">{formatNumber(analytics.alumni.total)}</div>
            <div className="metric-label">Total Alumni</div>
            <div className="metric-change positive">
              +{analytics.alumni.approved} approved
            </div>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">📅</div>
          <div className="metric-content">
            <div className="metric-value">{formatNumber(analytics.events.total)}</div>
            <div className="metric-label">Total Events</div>
            <div className="metric-change positive">
              {analytics.events.upcoming} upcoming
            </div>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <div className="metric-value">{formatCurrency(analytics.donations.total)}</div>
            <div className="metric-label">Total Donations</div>
            <div className="metric-change positive">
              {analytics.donations.count} donations
            </div>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-icon">🤝</div>
          <div className="metric-content">
            <div className="metric-value">{formatNumber(analytics.mentorships?.active || 0)}</div>
            <div className="metric-label">Active Mentorships</div>
            <div className="metric-change positive">
              {analytics.mentorships?.total || 0} total
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="analytics-sections">
        {/* Alumni Analytics */}
        <div className="analytics-section">
          <h3 className="section-title">Alumni Overview</h3>
          <div className="section-content">
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-number">{analytics.alumni.approved}</div>
                <div className="stat-label">Approved</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.alumni.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.alumni.rejected || 0}</div>
                <div className="stat-label">Declined</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.alumni.recent || 0}</div>
                <div className="stat-label">Last 30 Days</div>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill approved"
                style={{ width: `${analytics.alumni?.total > 0 ? (analytics.alumni.approved / analytics.alumni.total) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="progress-labels">
              <span>Approval Rate: {analytics.alumni?.total > 0 ? ((analytics.alumni.approved / analytics.alumni.total) * 100).toFixed(1) : 0}%</span>
            </div>
            
            {/* Alumni Demographics */}
            {analytics.alumni.byDepartment && analytics.alumni.byDepartment.length > 0 && (
              <div className="demographics-section">
                <h4 className="subsection-title">By Department</h4>
                <div className="demographics-grid">
                  {analytics.alumni.byDepartment.slice(0, 4).map((dept, index) => (
                    <div key={index} className="demographic-item">
                      <div className="demographic-label">{dept.department || 'Unknown'}</div>
                      <div className="demographic-value">{dept.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Top Companies */}
            {analytics.alumni.topCompanies && analytics.alumni.topCompanies.length > 0 && (
              <div className="demographics-section">
                <h4 className="subsection-title">Top Companies</h4>
                <div className="companies-list">
                  {analytics.alumni.topCompanies.map((company, index) => (
                    <div key={index} className="company-item">
                      <div className="company-name">{company.company}</div>
                      <div className="company-count">{company.count} alumni</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Events Analytics */}
        <div className="analytics-section">
          <h3 className="section-title">Events Overview</h3>
          <div className="section-content">
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-number">{analytics.events.upcoming}</div>
                <div className="stat-label">Upcoming</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.events.completed || 0}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.events.recent || 0}</div>
                <div className="stat-label">Last 30 Days</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.events.total}</div>
                <div className="stat-label">Total Events</div>
              </div>
            </div>
            
            {/* Event Engagement */}
            <div className="engagement-metrics">
              <div className="engagement-item">
                <div className="engagement-icon">📊</div>
                <div className="engagement-content">
                  <div className="engagement-label">Event Completion Rate</div>
                  <div className="engagement-value">
                    {analytics.events.total > 0 ? 
                      ((analytics.events.completed / analytics.events.total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Donations Analytics */}
        <div className="analytics-section">
          <h3 className="section-title">Donations Overview</h3>
          <div className="section-content">
            <div className="donation-stats">
              <div className="donation-summary">
                <div className="summary-item">
                  <div className="summary-value">{formatCurrency(analytics.donations.total)}</div>
                  <div className="summary-label">Total Raised</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value">{analytics.donations.count}</div>
                  <div className="summary-label">Total Donations</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value">
                    {analytics.donations.count > 0 ? formatCurrency(analytics.donations.total / analytics.donations.count) : '₹0'}
                  </div>
                  <div className="summary-label">Average Donation</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value">{formatCurrency(analytics.donations.recentTotal || 0)}</div>
                  <div className="summary-label">Last 30 Days</div>
                </div>
              </div>
            </div>
            
            {/* Recent Donation Activity */}
            {analytics.donations.recent > 0 && (
              <div className="recent-activity">
                <div className="activity-highlight">
                  <div className="activity-icon">💰</div>
                  <div className="activity-text">
                    <strong>{analytics.donations.recent}</strong> donations in the last 30 days
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mentorship Analytics */}
        <div className="analytics-section">
          <h3 className="section-title">Mentorship Overview</h3>
          <div className="section-content">
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-number">{analytics.mentorships.active}</div>
                <div className="stat-label">Active</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.mentorships.pending || 0}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.mentorships.total || 0}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
            
            {/* Mentorship Success Rate */}
            <div className="engagement-metrics">
              <div className="engagement-item">
                <div className="engagement-icon">🤝</div>
                <div className="engagement-content">
                  <div className="engagement-label">Active Mentorship Rate</div>
                  <div className="engagement-value">
                    {analytics.mentorships.total > 0 ? 
                      ((analytics.mentorships.active / analytics.mentorships.total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs Analytics */}
        <div className="analytics-section">
          <h3 className="section-title">Jobs Overview</h3>
          <div className="section-content">
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-number">{analytics.jobs.active || 0}</div>
                <div className="stat-label">Active Jobs</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.jobs.total || 0}</div>
                <div className="stat-label">Total Posted</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{analytics.jobs.closed || 0}</div>
                <div className="stat-label">Closed</div>
              </div>
            </div>
            
            {/* Job Success Rate */}
            {analytics.jobs.total > 0 && (
              <div className="engagement-metrics">
                <div className="engagement-item">
                  <div className="engagement-icon">💼</div>
                  <div className="engagement-content">
                    <div className="engagement-label">Job Posting Success Rate</div>
                    <div className="engagement-value">
                      {((analytics.jobs.active / analytics.jobs.total) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Growth Trends */}
      <div className="analytics-section">
        <h3 className="section-title">Growth Trends (Last 30 Days)</h3>
        <div className="section-content">
          <div className="growth-metrics">
            <div className="growth-item">
              <div className="growth-icon">📈</div>
              <div className="growth-content">
                <div className="growth-label">New Alumni</div>
                <div className="growth-value">{analytics.alumni.recent || 0}</div>
                <div className="growth-trend positive">+{analytics.alumni.recent || 0} this month</div>
              </div>
            </div>
            <div className="growth-item">
              <div className="growth-icon">📅</div>
              <div className="growth-content">
                <div className="growth-label">New Events</div>
                <div className="growth-value">{analytics.events.recent || 0}</div>
                <div className="growth-trend positive">+{analytics.events.recent || 0} this month</div>
              </div>
            </div>
            <div className="growth-item">
              <div className="growth-icon">💰</div>
              <div className="growth-content">
                <div className="growth-label">New Donations</div>
                <div className="growth-value">{analytics.donations.recent || 0}</div>
                <div className="growth-trend positive">+{analytics.donations.recent || 0} this month</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="analytics-section">
        <h3 className="section-title">Platform Health</h3>
        <div className="section-content">
          <div className="health-metrics">
            <div className="health-item">
              <div className="health-icon">✅</div>
              <div className="health-content">
                <div className="health-label">System Status</div>
                <div className="health-value">All Systems Operational</div>
              </div>
            </div>
            <div className="health-item">
              <div className="health-icon">👥</div>
              <div className="health-content">
                <div className="health-label">Alumni Engagement</div>
                <div className="health-value">
                  {analytics.alumni.total > 0 ? 
                    ((analytics.alumni.approved / analytics.alumni.total) * 100).toFixed(0) : 0}% Active
                </div>
              </div>
            </div>
            <div className="health-item">
              <div className="health-icon">📊</div>
              <div className="health-content">
                <div className="health-label">Platform Growth</div>
                <div className="health-value">
                  {analytics.alumni.recent > 0 ? 'Growing' : 'Stable'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
