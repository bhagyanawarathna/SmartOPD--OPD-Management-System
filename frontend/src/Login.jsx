import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom'; // to include register button in to login page
import './App.css';

function Login() {
    const [values, setValues] = useState({ 
        email: '', 
        password: '', 
        role: '' // Added role state
    });
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!values.role) {
            alert("Please select your role!");
            return;
        }

        axios.post('http://localhost:5000/login', values)
            .then(res => {
                if(res.data.Status === "Success") {
                    console.log("Full Response Data:", res.data);
                    alert(`Login Successful as ${values.role}`);
                    // Redirect based on role
                    if(values.role === 'Patient') {
                        // Pass the patient data returned from the backend to the dashboard
                        navigate('/patient-dashboard', { state: { patient: res.data.Data } });
                    } else if(values.role === 'Doctor') {
                        navigate('/doctor-dashboard');
                    }
                } else {
                    alert(res.data.Error);
                }
            })
            .catch(err => console.log(err));
    };

    return (
        <div className="register-container">
            <h2 style={{color: '#007bff'}}>Hospital Staff Login</h2>
            <form onSubmit={handleSubmit}>
                    <select 
                        required 
                        style={{width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px'}}
                        onChange={e => setValues({...values, role: e.target.value})}
                    >
                        <option value="">-- Select Your Role --</option>
                        <option value="Admin">Admin</option>
                        <option value="Doctor">Doctor</option>
                        <option value="Specialist Consultant">Specialist Consultant</option>
                        <option value="Receptionist">Receptionist</option>
                        <option value="Pharmacist">Pharmacist</option>
                        <option value="Patient">Patient</option>
                    </select>

                <input type="email" placeholder="Staff Email" required 
                    onChange={e => setValues({...values, email: e.target.value})} />
                
                <input type="password" placeholder="Password" required 
                    onChange={e => setValues({...values, password: e.target.value})} />
                
                <button type="submit">Login</button>
                <p style={{ marginTop: '15px', fontSize: '14px' }}>
                    Not registered yet? <Link to="/register" style={{ color: '#007bff', fontWeight: 'bold' }}>Create a Patient Account</Link>
                </p>
            </form>
        </div>
    );
}

export default Login;