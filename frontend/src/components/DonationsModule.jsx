import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/DonationsModule.css';

function DonationsModule({ user }) {
  const [donations, setDonations] = useState([]);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [donationForm, setDonationForm] = useState({
    amount: '',
    payment_method: 'razorpay'
  });

  const [donationStats, setDonationStats] = useState({
    totalDonations: 0,
    totalAmount: 0
  });

  useEffect(() => {
    if (user && user.id) {
      fetchDonations();
      fetchDonationStats();
    }
  }, [user]);

  const fetchDonations = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getDonations(user.id);
      setDonations(response.donations);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDonationStats = async () => {
    try {
      const response = await apiService.getDonationStats();
      setDonationStats(response.stats);
    } catch (err) {
      console.error('Error fetching donation stats:', err);
    }
  };

  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    if (!donationForm.amount || donationForm.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // In a real implementation, you would integrate with Razorpay/Stripe here
      // For now, we'll simulate the payment process
      const paymentResult = await simulatePayment(donationForm.amount, donationForm.payment_method);
      
      if (paymentResult.success) {
        await apiService.createDonation({
          donor_id: user.id,
          amount: parseFloat(donationForm.amount),
          payment_method: donationForm.payment_method,
          payment_id: paymentResult.payment_id
        });
        
        setSuccess(`Thank you for your donation of ₹${donationForm.amount}!`);
        setDonationForm({ amount: '', payment_method: 'razorpay' });
        setShowDonationForm(false);
        fetchDonations();
        fetchDonationStats();
      } else {
        setError('Payment failed. Please try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate payment processing
  const simulatePayment = async (amount, method) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          payment_id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }, 2000);
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      completed: 'status-completed',
      failed: 'status-failed',
      refunded: 'status-refunded'
    };
    return <span className={`status-badge ${statusClasses[status]}`}>{status}</span>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const predefinedAmounts = [500, 1000, 2500, 5000, 10000];

  return (
    <div className="donations-module">
      <div className="donations-header">
        <h2>Support Our Alumni Community</h2>
        <p className="donations-subtitle">
          Help us maintain and improve the AlumniConnect platform
        </p>
      </div>

      <div className="donation-stats">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-number">{donationStats.totalAmount}</div>
            <div className="stat-label">Total Raised</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <div className="stat-number">{donationStats.totalDonations}</div>
            <div className="stat-label">Total Donations</div>
          </div>
        </div>
      </div>

      <div className="donation-actions">
        <button 
          className="btn btn-primary btn-large"
          onClick={() => setShowDonationForm(true)}
        >
          💝 Make a Donation
        </button>
      </div>

      {error && (
        <div className="message error">
          {error}
        </div>
      )}

      {success && (
        <div className="message success">
          {success}
        </div>
      )}

      <div className="donations-list">
        <h3>Your Donations</h3>
        {isLoading ? (
          <div className="loading">Loading donations...</div>
        ) : donations.length === 0 ? (
          <div className="empty-state">
            <p>No donations found.</p>
          </div>
        ) : (
          <div className="donations-grid">
            {donations.map(donation => (
              <div key={donation.id} className="donation-card">
                <div className="donation-amount">
                  {formatCurrency(donation.amount)}
                </div>
                <div className="donation-details">
                  <div className="donation-method">
                    Payment: {donation.payment_method}
                  </div>
                  <div className="donation-date">
                    {new Date(donation.created_at).toLocaleDateString()}
                  </div>
                  <div className="donation-status">
                    {getStatusBadge(donation.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Donation Form Modal */}
      {showDonationForm && (
        <div className="modal-overlay" onClick={() => setShowDonationForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Make a Donation</h3>
              <button className="modal-close" onClick={() => setShowDonationForm(false)}>×</button>
            </div>
            <form onSubmit={handleDonationSubmit} className="donation-form">
              <div className="form-group">
                <label>Donation Amount</label>
                <div className="amount-input">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={donationForm.amount}
                    onChange={(e) => setDonationForm({...donationForm, amount: e.target.value})}
                    placeholder="Enter amount"
                    min="1"
                    step="1"
                    required
                  />
                </div>
                <div className="predefined-amounts">
                  {predefinedAmounts.map(amount => (
                    <button
                      key={amount}
                      type="button"
                      className={`amount-btn ${donationForm.amount == amount ? 'selected' : ''}`}
                      onClick={() => setDonationForm({...donationForm, amount: amount.toString()})}
                    >
                      ₹{amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={donationForm.payment_method}
                  onChange={(e) => setDonationForm({...donationForm, payment_method: e.target.value})}
                >
                  <option value="razorpay">Razorpay (Cards, UPI, Net Banking)</option>
                  <option value="stripe">Stripe (International Cards)</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="donation-info">
                <h4>How your donation helps:</h4>
                <ul>
                  <li>🎓 Maintain and improve the platform</li>
                  <li>📧 Send event notifications and updates</li>
                  <li>🔒 Ensure data security and privacy</li>
                  <li>📱 Develop new features and mobile apps</li>
                  <li>🎉 Organize alumni events and meetups</li>
                </ul>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDonationForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Processing...' : `Donate ${formatCurrency(donationForm.amount || 0)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DonationsModule;
