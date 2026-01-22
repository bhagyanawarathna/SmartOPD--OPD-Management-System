import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import axios from 'axios';
import './App.css';

function PatientDashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const initialPatient = location.state?.patient;

    // --- 1. STATE DECLARATIONS ---
    const [patientData, setPatientData] = useState(initialPatient);
    const [activeTab, setActiveTab] = useState('Home');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editValues, setEditValues] = useState({});

    // Appointment specific states
    const [appointments, setAppointments] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');

    // patient dashboard related states
    const [medicalHistory, setMedicalHistory] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackList, setFeedbackList] = useState([]);

    // --- 2. DATA FETCHING (EFFECTS) ---
    // PatientDashboard.jsx

    // ... (existing states)

    useEffect(() => {
        // 1. If user clicks Profile, get profile data
        if (activeTab === 'Profile' && initialPatient?.email) fetchProfile();

        // 2. If user clicks Appointments, get appointment data
        if (activeTab === 'Appointments' && patientData?.patient_id) fetchAppointments();

        // 3. If user clicks Medical Records, get history from backend
        if (activeTab === 'Medical Records' && patientData?.patient_id) {
            axios.get(`http://localhost:5000/medical-history/${patientData.patient_id}`)
                .then(res => setMedicalHistory(res.data.Data || []))
                .catch(err => console.error("History Fetch Error:", err));
        }

        // 4. If user clicks Notifications, get alerts from backend
        if (activeTab === 'Notifications' && patientData?.patient_id) {
            axios.get(`http://localhost:5000/notifications/${patientData.patient_id}`)
                .then(res => setNotifications(res.data.Data || []))
                .catch(err => console.error("Notification Fetch Error:", err));
        }

        if (activeTab === 'Feedback' && patientData?.patient_id) {
            fetchFeedback();
        }
    }, [activeTab, patientData?.patient_id]); // This watches the tab switch

    const fetchProfile = () => {
        axios.get(`http://localhost:5000/patient-profile/${initialPatient.email}`)
            .then(res => {
                if (res.data.Status === "Success") {
                    setPatientData(res.data.Data);
                    setEditValues(res.data.Data);
                }
            }).catch(err => console.log(err));
    };

    const fetchAppointments = () => {
        axios.get(`http://localhost:5000/my-appointments/${patientData.patient_id}`)
            .then(res => {
                if (res.data.Status === "Success") {
                    setAppointments(res.data.Data);
                }
            }).catch(err => console.log(err));
    };

    // --- 3. EVENT HANDLERS ---
    const handleUpdate = (e) => {
        e.preventDefault();
        axios.post('http://localhost:5000/update-profile', editValues)
            .then(res => {
                if (res.data.Status === "Success") {
                    alert("Profile updated successfully!");
                    setIsEditModalOpen(false);
                    fetchProfile();
                }
            }).catch(err => console.error(err));
    };

    const handleBooking = () => {
        if (!selectedDate) return alert("Please select a date");

        // DEBUG: Check if ID exists before sending
        if (!patientData.patient_id) {
            console.error("Missing patient_id. Current patientData:", patientData);
            return alert("Error: Patient ID not found. Please log out and log in again.");
        }

        axios.post('http://localhost:5000/book-appointment', {
            patient_id: patientData.patient_id,
            appointment_day: selectedDate
        }).then(res => {
            console.log("Server Response:", res.data); // See what the server says
            if (res.data.Status === "Success") {
                alert(`Booking Confirmed!\nToken: #${res.data.QueueNo}\nEst. Arrival: ${res.data.EstimatedTime}`);
                fetchAppointments();
            } else {
                alert("Server Error: " + (res.data.Message || res.data.Error));
            }
        }).catch(err => {
            console.error("Axios Error:", err);
            alert("Failed to connect to server.");
        });
    };

    const handleCancel = (id) => {
        if (window.confirm("Are you sure you want to cancel this appointment?")) {
            axios.post('http://localhost:5000/cancel-appointment', { appointment_id: id })
                .then(res => {
                    if (res.data.Status === "Success") fetchAppointments();
                });
        }
    };

    const submitFeedback = () => {
        if (!feedbackText.trim()) {
            alert("Please write something before submitting.");
            return;
        }

        axios.post('http://localhost:5000/submit-feedback', {
            patient_id: patientData.patient_id,
            comments: feedbackText
        })
            .then(res => {
                if (res.data.Status === "Success") {
                    alert("Feedback submitted successfully! Thank you.");
                    setFeedbackText(''); // Clears the textarea
                    fetchFeedback(); // <--- This refreshes the list instantly!
                } else {
                    alert("Error: " + res.data.Message);
                }
            })
            .catch(err => {
                console.error("Feedback error:", err);
                alert("Failed to send feedback. Check server connection.");
            });
    };

    const fetchFeedback = () => {
        // Check if patient_id exists before making the call
        const pid = patientData?.patient_id;
        if (!pid) {
            console.log("Waiting for patient ID...");
            return;
        }

        axios.get(`http://localhost:5000/my-feedback/${pid}`)
            .then(res => {
                if (res.data.Status === "Success") {
                    setFeedbackList(res.data.Data || []);
                }
            })
            .catch(err => {
                console.error("Error fetching feedback list:", err);
            });
    };


    if (!initialPatient) return <div className="session-error">Session Expired. Please login.</div>;

    return (
        <div className="dashboard-container">
            {/* SIDEBAR */}
            <nav className="side-nav">
                <div className="brand">
                    <span className="brand-dot"></span> SmartOPD
                </div>
                <div className="nav-menu">
                    {['Home', 'Profile', 'Appointments', 'Medical Records', 'Notifications', 'Feedback'].map((tab) => (
                        <div
                            key={tab}
                            className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </div>
                    ))}
                </div>
                <button className="logout-link" onClick={() => navigate('/login')}>Sign Out</button>
            </nav>

            {/* MAIN CONTENT */}
            <main className="content-area">
                <header className="top-bar">
                    <div className="page-title">
                        <h2>{activeTab}</h2>
                        <p>Welcome back, {patientData.first_name}</p>
                    </div>
                    <div className="user-profile-header">
                        <div className="user-info">
                            <strong>{patientData.first_name} {patientData.surname}</strong>
                            <span>{patientData.email}</span>
                        </div>
                        <div className="avatar-circle">{patientData.first_name.charAt(0)}</div>
                    </div>
                </header>

                {/* --- 1. MEDICAL RECORDS TAB --- */}
                {activeTab === 'Medical Records' && (
                    <div className="records-wrapper animate-fade">
                        <div className="card">
                            <h3>My Medical History</h3>
                            {medicalHistory.length === 0 ? (
                                <p style={{ marginTop: '10px', color: '#64748b' }}>No medical records found.</p>
                            ) : (
                                <div className="records-list" style={{ marginTop: '15px' }}>
                                    {medicalHistory.map((rec, index) => (
                                        <div key={index} className="record-item" style={{ borderLeft: '4px solid #3b82f6', padding: '15px', background: '#f8fafc', marginBottom: '10px', borderRadius: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <strong>Date: {new Date(rec.consultation_day).toLocaleDateString()}</strong>
                                                <span className="priority-tag" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#dbeafe' }}>{rec.priority}</span>
                                            </div>
                                            <p style={{ margin: '10px 0' }}><strong>Details:</strong> {rec.treatment_details}</p>
                                            {rec.prescription_details && (
                                                <div style={{ background: '#fff', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '4px' }}>
                                                    <strong>Prescription:</strong> {rec.prescription_details}
                                                </div>
                                            )}
                                            <small style={{ display: 'block', marginTop: '10px', color: '#64748b' }}>Consulted by: Dr. {rec.doctor_name}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- 2. NOTIFICATIONS TAB --- */}
                {activeTab === 'Notifications' && (
                    <div className="notifications-wrapper animate-fade">
                        <div className="card">
                            <h3>Recent Notifications</h3>
                            <div className="notif-list" style={{ marginTop: '15px' }}>
                                {notifications.length > 0 ? notifications.map((n, i) => (
                                    <div key={i} className="notif-item" style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                        <p>{n.message}</p>
                                        <small style={{ color: '#94a3b8' }}>{new Date(n.sent_time).toLocaleString()}</small>
                                    </div>
                                )) : <p>No new notifications.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 3. FEEDBACK TAB --- */}
                {activeTab === 'Feedback' && (
                    <div className="feedback-container animate-fade">
                        {/* Section 1: Submit Form */}
                        <div className="card shadow-sm mb-4">
                            <h3>Submit New Feedback</h3>
                            <textarea
                                className="form-control mt-2"
                                style={{ height: '100px', borderRadius: '8px', border: '1px solid #ddd', padding: '10px', width: '100%' }}
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="How was your experience today?"
                            />
                            <button className="btn-primary mt-3" onClick={submitFeedback}>Submit Feedback</button>
                        </div>

                        {/* Section 2: History List */}
                        <div className="card shadow-sm">
                            <h3>Your Previous Feedback</h3>
                            <div className="feedback-list mt-3">
                                {feedbackList.length === 0 ? (
                                    <p className="text-muted">No feedback submitted yet.</p>
                                ) : (
                                    feedbackList.map((f, i) => (
                                        <div key={i} className="feedback-item" style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <small className="text-primary">{new Date(f.date_submitted).toLocaleDateString()}</small>
                                                {/* We show a 'sent' badge since it's a record */}
                                                <span style={{ fontSize: '0.7rem', color: '#22c55e', background: '#f0fdf4', padding: '2px 8px', borderRadius: '10px' }}>Submitted</span>
                                            </div>
                                            <p style={{ marginTop: '8px', color: '#334155' }}>"{f.comments}"</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* PROFILE TAB */}
                {activeTab === 'Profile' && (
                    <div className="profile-wrapper animate-fade">
                        <section className="profile-main">
                            <div className="card">
                                <div className="card-header">
                                    <h3>Patient Particulars</h3>
                                    <button onClick={() => setIsEditModalOpen(true)} className="btn-text">Edit Details</button>
                                </div>
                                <div className="details-grid">
                                    <div className="detail-item"><label>Registration Name</label><p>{patientData.first_name} {patientData.surname}</p></div>
                                    <div className="detail-item"><label>Contact Number</label><p>{patientData.phone || '--'}</p></div>
                                    <div className="detail-item"><label>Email Address</label><p>{patientData.email}</p></div>
                                    <div className="detail-item"><label>Blood Group</label><p className="blood-tag">{patientData.blood_group || 'Not Set'}</p></div>
                                    <div className="detail-item full-width"><label>Residential Address</label><p>{patientData.address || 'Update address in settings'}</p></div>
                                </div>
                            </div>

                            <div className="card medical-card">
                                <h3>Clinical Background</h3>
                                <div className="details-grid">
                                    <div className="detail-item"><label>Known Allergies</label><p>{patientData.allergies || 'No known allergies'}</p></div>
                                    <div className="detail-item"><label>Chronic Conditions</label><p>{patientData.chronic_diseases || 'None'}</p></div>
                                </div>
                            </div>
                        </section>

                        <aside className="profile-aside">
                            <div className="id-card-modern">
                                <div className="id-header">Medical ID</div>
                                <div className="barcode-container">
                                    <Barcode value={patientData.barcode} width={1.2} height={50} displayValue={false} />
                                    <span>{patientData.barcode}</span>
                                </div>
                                <div className="id-footer">Kiribathgoda Hospital</div>
                            </div>
                        </aside>
                    </div>
                )}

                {/* APPOINTMENTS TAB */}
                {activeTab === 'Appointments' && (
                    <div className="appointments-wrapper animate-fade">
                        <div className="card booking-card">
                            <h3>Schedule New Consultation</h3>
                            <div className="booking-form" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <input
                                    type="date"
                                    min={new Date().toISOString().split("T")[0]}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="modern-input"
                                />
                                <button className="btn-primary" onClick={handleBooking}>Check Availability & Book</button>
                            </div>
                            <p className="hint" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>
                                * Appointments are assigned based on daily OPD capacity.
                            </p>
                        </div>

                        <div className="card history-card" style={{ marginTop: '20px' }}>
                            <h3>My Appointments</h3>
                            <table className="modern-table" style={{ width: '100%', marginTop: '15px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                                        <th style={{ padding: '12px' }}>Date</th>
                                        <th>Token</th>
                                        <th>Est. Arrival</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map((app) => (
                                        <tr key={app.appointment_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px' }}>{new Date(app.appointment_day).toLocaleDateString()}</td>
                                            <td><span className="token-badge" style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>#{app.queue_no}</span></td>
                                            <td>{8 + Math.floor(((app.queue_no - 1) * 10) / 60)}:{((app.queue_no - 1) * 10) % 60 === 0 ? '00' : ((app.queue_no - 1) * 10) % 60} AM</td>
                                            <td style={{ textTransform: 'capitalize' }}>{app.status}</td>
                                            <td>
                                                {app.status === 'booked' && (
                                                    <button onClick={() => handleCancel(app.appointment_id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'Medical Records' && (
                    <div className="records-container animate-fade">
                        {medicalHistory.map((rec, index) => (
                            <div className="card record-card" key={index}>
                                <div className="record-header">
                                    <h4>Consultation: {new Date(rec.consultation_day).toLocaleDateString()}</h4>
                                    <span className={`priority-tag ${rec.priority}`}>{rec.priority}</span>
                                </div>
                                <p><strong>Diagnosis/Details:</strong> {rec.treatment_details}</p>
                                {rec.prescription_details && (
                                    <div className="prescription-box">
                                        <strong>Prescription:</strong> {rec.prescription_details}
                                    </div>
                                )}
                                <small>Doctor: Dr. {rec.doctor_name}</small>
                            </div>
                        ))}
                    </div>
                )}



            </main>

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Edit Profile</h3>
                            <button className="close-x" onClick={() => setIsEditModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleUpdate} className="modern-form">
                            <div className="input-group">
                                <input type="text" placeholder="First Name" value={editValues.first_name} onChange={e => setEditValues({ ...editValues, first_name: e.target.value })} />
                                <input type="text" placeholder="Surname" value={editValues.surname} onChange={e => setEditValues({ ...editValues, surname: e.target.value })} />
                            </div>
                            <input type="text" placeholder="Phone" value={editValues.phone} onChange={e => setEditValues({ ...editValues, phone: e.target.value })} />
                            <textarea placeholder="Full Address" value={editValues.address} onChange={e => setEditValues({ ...editValues, address: e.target.value })} />
                            <select value={editValues.blood_group} onChange={e => setEditValues({ ...editValues, blood_group: e.target.value })}>
                                <option value="">Select Blood Group</option>
                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <div className="modal-btns">
                                <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Update Profile</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PatientDashboard;