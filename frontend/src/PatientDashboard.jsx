import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import './App.css'; // We will add styles here

function PatientDashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const patient = location.state?.patient;
    
    // State to track which "tab" is active
    const [activeTab, setActiveTab] = useState('Home');

    if (!patient) {
        return <div style={{textAlign: 'center', marginTop: '50px'}}><h2>Session Expired. Please Login.</h2><button onClick={() => navigate('/login')}>Login</button></div>;
    }

    // Logic for Token Time Estimation
    const tokenNumber = 12; // This will come from your DB later
    const minutesPerPatient = 10;
    const estimatedWaitTime = tokenNumber * minutesPerPatient;

    return (
        <div className="dashboard-wrapper" style={{ display: 'flex', height: '100vh', backgroundColor: '#f4f7f6' }}>
            
            {/* --- SIDEBAR --- */}
            <div className="sidebar" style={{ width: '250px', backgroundColor: '#003366', color: 'white', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                <h2 style={{ color: '#00d1b2', marginBottom: '30px', textAlign: 'center' }}>SmartOPD</h2>
                <div className="sidebar-links" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {['Home', 'Profile', 'Appointments', 'Prescriptions', 'Medical Records', 'Notifications', 'Feedback'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                textAlign: 'left', padding: '12px', background: activeTab === tab ? '#00509d' : 'transparent',
                                color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <button onClick={() => navigate('/login')} style={{ marginTop: 'auto', background: '#e63946', color: 'white', border: 'none', padding: '10px', borderRadius: '5px' }}>Logout</button>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="main-content" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <h1 style={{ color: '#333' }}>{activeTab}</h1>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold' }}>{patient.first_name} {patient.surname}</span>
                        <p style={{ fontSize: '12px', color: '#777' }}>Patient ID: {patient.barcode}</p>
                    </div>
                </header>

                {/* --- TAB CONTENT: HOME --- */}
                {activeTab === 'Home' && (
                    <div className="tab-home animate-in">
                        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                            <h2 style={{ color: '#007bff' }}>Welcome back, {patient.first_name}! 👋</h2>
                            <p>Here is your current status for today at Kiribathgoda Hospital.</p>
                            
                            <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                                {/* Appointment Card */}
                                <div style={{ flex: 1, borderLeft: '5px solid #00d1b2', padding: '20px', backgroundColor: '#f0fff4', borderRadius: '8px' }}>
                                    <h4>Upcoming Appointment</h4>
                                    <p><strong>Date:</strong> 2026-01-25</p>
                                    <p><strong>Token Number:</strong> <span style={{ fontSize: '24px', color: '#003366' }}>#{tokenNumber}</span></p>
                                    <p><strong>Estimated Time:</strong> Approx. {estimatedWaitTime} mins wait</p>
                                </div>

                                {/* Barcode Card */}
                                <div style={{ flex: 1, textAlign: 'center', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', padding: '10px' }}>
                                    <Barcode value={patient.barcode} width={1.5} height={50} />
                                    <p style={{ fontSize: '10px' }}>Scan at Reception</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setActiveTab('Appointments')}
                                style={{ marginTop: '30px', padding: '15px 30px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                + Book New Appointment
                            </button>
                        </div>
                    </div>
                )}

                {/* --- PLACEHOLDERS FOR OTHER TABS --- */}
                {activeTab !== 'Home' && (
                    <div style={{ background: 'white', padding: '50px', borderRadius: '15px', textAlign: 'center' }}>
                        <h3>{activeTab} module is coming soon!</h3>
                        <p>We are currently integrating your hospital records.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PatientDashboard;