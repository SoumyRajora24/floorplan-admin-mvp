import React, { useState } from 'react';
import { bookingAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './BookingPanel.css';

const BookingPanel = ({ floorPlanId, onClose }) => {
  const [form, setForm] = useState({
    capacity: 1,
    startTime: '',
    endTime: '',
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    if (!form.startTime || !form.endTime) {
      toast.error('Please select start and end time');
      return;
    }

    setLoading(true);
    try {
      const response = await bookingAPI.suggest({
        capacity: parseInt(form.capacity),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      setSuggestions(response.data);
      if (response.data.length === 0) {
        toast.error('No rooms available for the selected time');
      }
    } catch (error) {
      toast.error('Failed to get room suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (roomId) => {
    try {
      await bookingAPI.create({
        roomId,
        title: 'Meeting',
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        attendees: parseInt(form.capacity),
      });
      toast.success('Room booked successfully');
      setSuggestions([]);
      setForm({ capacity: 1, startTime: '', endTime: '' });
    } catch (error) {
      if (error.alternatives) {
        toast.error('Room no longer available. Showing alternatives.');
        setSuggestions(error.alternatives);
      } else {
        toast.error('Failed to book room');
      }
    }
  };

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-header">
          <h3>Book a Meeting Room</h3>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="booking-form">
          <div className="form-group">
            <label>Number of Attendees</label>
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Start Time</label>
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>End Time</label>
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>

          <button onClick={handleSuggest} className="btn-suggest" disabled={loading}>
            {loading ? 'Finding rooms...' : '🔍 Find Available Rooms'}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="suggestions-list">
            <h4>Suggested Rooms</h4>
            {suggestions.map(({ room, score, reasoning, proximity, isLastBooked }) => (
              <div key={room.id} className={`suggestion-card ${isLastBooked ? 'last-booked' : ''}`}>
                <div className="suggestion-info">
                  <h5>
                    {room.name}
                    {isLastBooked && (
                      <span className="last-booked-badge" title="You last booked this room">
                        ⭐ Last Booked
                      </span>
                    )}
                  </h5>
                  <p className="capacity">Capacity: {room.capacity}</p>
                  <p className="reasoning">{reasoning}</p>
                  {proximity !== undefined && proximity >= 60 && (
                    <p className="proximity-indicator">
                      📍 {proximity >= 80 ? 'Very close' : 'Nearby'} location
                    </p>
                  )}
                  <div className="score">Match Score: {Math.round(score)}%</div>
                </div>
                <button onClick={() => handleBook(room.id)} className="btn-book">
                  Book Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPanel;
