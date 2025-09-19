import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/MentorshipModule.css';

function MentorshipModule({ user, userRole }) {
  const [programs, setPrograms] = useState([]);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [programForm, setProgramForm] = useState({
    subject: '',
    description: '',
    whatsapp_link: '',
    batch_size: ''
  });

  const getNormalizedUserId = () => {
    const candidate = user?.user_id ?? user?.id ?? user?.uid;
    if (Array.isArray(candidate)) {
      const first = candidate.find(v => typeof v === 'number' && !Number.isNaN(v));
      if (typeof first === 'number') return first;
    }
    if (typeof candidate === 'string') {
      const m = String(candidate).match(/\d+/);
      if (m) return parseInt(m[0], 10);
    }
    const n = parseInt(candidate, 10);
    return Number.isNaN(n) ? undefined : n;
  };

  useEffect(() => {
    if (user && (user.user_id || user.id)) {
      loadPrograms();
    }
  }, [user]);

  const loadPrograms = async () => {
    try {
      setIsLoading(true);
      const uid = getNormalizedUserId();
      const response = await apiService.listMentorshipPrograms(uid);
      const list = response?.programs || [];
      console.log('Mentorship programs (student) length =', list.length);
      if (list.length === 0) {
        try {
          const adminView = await apiService.getAdminMentorshipPrograms();
          const fallback = adminView?.programs || [];
          console.log('Fallback admin programs length =', fallback.length);
          if (fallback.length > 0) setPrograms(fallback);
          else setPrograms([]);
        } catch (e) {
          setPrograms([]);
        }
      } else {
        setPrograms(list);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    if (!programForm.subject || !programForm.whatsapp_link || !programForm.batch_size) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setIsLoading(true);
      await apiService.createMentorshipProgram({
        mentor_user_id: parseInt(user.user_id || user.id, 10),
        subject: programForm.subject,
        description: programForm.description,
        whatsapp_link: programForm.whatsapp_link,
        batch_size: parseInt(programForm.batch_size, 10)
      });
      setSuccess('Mentorship program created!');
      setProgramForm({ subject: '', description: '', whatsapp_link: '', batch_size: '' });
      setShowCreateProgram(false);
      loadPrograms();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const joinProgram = async (programId) => {
    try {
      setIsLoading(true);
      const uid = getNormalizedUserId();
      await apiService.joinMentorshipProgram(programId, uid);
      setSuccess('Joined program successfully');
      await loadPrograms();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const subjectAreas = [
    'Computer Science', 'Engineering', 'Business', 'Data Science',
    'Machine Learning', 'Web Development', 'Mobile Development',
    'DevOps', 'Cybersecurity', 'Product Management', 'Marketing',
    'Finance', 'Design', 'Other'
  ];

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      completed: 'status-completed'
    };
    return <span className={`status-badge ${statusClasses[status]}`}>{status}</span>;
  };

  const WHATSAPP_ICON = import.meta.env.VITE_WHATSAPP_ICON || '/icons/whatsapp.svg';

  return (
    <div className="mentorship-module">
      <div className="mentorship-header">
        <h2>Mentorship Programs</h2>
        <div className="mentorship-actions">
          {userRole === 'alumni' && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateProgram(true)}
            >
              Create Program
            </button>
          )}
        </div>
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

      <div className="mentorships-list">
        {isLoading ? (
          <div className="loading">Loading programs...</div>
        ) : programs.length === 0 ? (
          <div className="empty-state">
            <p>No mentorship programs available yet.</p>
          </div>
        ) : (
          programs.map(program => (
            <div key={program.id} className="mentorship-card">
              <div className="mentorship-info">
                <h4>{program.mentor_name}</h4>
                <p className="mentorship-subject">{program.subject}</p>
                <p className="mentorship-description">{program.description}</p>
                <div className="mentorship-meta">
                  <span>
                    Capacity: {program.joined_count}/{program.batch_size}
                  </span>
                </div>
              </div>
              <div className="mentorship-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {userRole === 'student' && (
                  <>
                    <button
                      className={`btn ${Number(program.joined_by_me) === 1 ? 'btn-success' : (program.joined_count >= program.batch_size ? 'btn-disabled' : 'btn-primary')}`}
                      disabled={Number(program.joined_by_me) === 1 || program.joined_count >= program.batch_size}
                      onClick={() => joinProgram(program.id)}
                    >
                      {Number(program.joined_by_me) === 1
                        ? 'Joined'
                        : (program.joined_count >= program.batch_size ? 'Oops, batch full' : 'Join Program')}
                    </button>
                    {Number(program.joined_by_me) === 1 && (
                      <a
                        href={program.whatsapp_link}
                        target="_blank"
                        rel="noreferrer"
                        className="community-icon"
                        title="WhatsApp Group"
                      >
                        <img src={WHATSAPP_ICON} alt="WhatsApp" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Program Modal */}
      {showCreateProgram && (
        <div className="modal-overlay" onClick={() => setShowCreateProgram(false)}>
          <div className="modal-content register-mentor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Mentorship Program</h3>
              <button className="modal-close" onClick={() => setShowCreateProgram(false)}>×</button>
            </div>
            <form onSubmit={handleCreateProgram} className="mentorship-form">
              <div className="form-group">
                <label>Subject</label>
                <select
                  value={programForm.subject}
                  onChange={(e) => setProgramForm({ ...programForm, subject: e.target.value })}
                  required
                >
                  <option value="">Select subject</option>
                  {subjectAreas.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={programForm.description}
                  onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                  placeholder="Describe what this program covers"
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>WhatsApp Link</label>
                <input
                  type="url"
                  value={programForm.whatsapp_link}
                  onChange={(e) => setProgramForm({ ...programForm, whatsapp_link: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Batch Size</label>
                <input
                  type="number"
                  min="1"
                  value={programForm.batch_size}
                  onChange={(e) => setProgramForm({ ...programForm, batch_size: e.target.value })}
                  placeholder="e.g., 20"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateProgram(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MentorshipModule;
