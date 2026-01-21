import React, { useState } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import './App.css';
import { useNavigate } from 'react-router-dom'; // to link the patient dashboard to the reguster button

function Register() {
    const [values, setValues] = useState({
        first_name: '',
        mid_name: '', // Added
        surname: '',
        dob: '',      // Added
        gender: '',   // Added
        email: '',
        phone: '',    // Added
        address: '',  // Added
        age: '',      // Added
        password: ''
    });

    // to link the register button to patient dashboard
    const navigate = useNavigate();

    // This holds the barcode ID after the database saves the patient
    const [showBarcode, setShowBarcode] = useState('');

    // state to confirm password
    const [confirmPassword, setConfirmPassword] = useState('');

    // function to auto clculate age based on dob
    const calculateAge = (dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();

        // Adjust age if birthday hasn't happened yet this year
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleSubmit = (e) => {
    e.preventDefault();

    // 1. Check Length
    if (values.password.length < 8) {
        alert("Password must be at least 8 characters long.");
        return;
    }

    // 2. Check Complexity (Regex)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(values.password)) {
            alert("Password must contain at least one uppercase letter, one number, and one special character.");
            return;
        }

        // 3. Check Match
        if (values.password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // If all pass, send to database
        axios.post('http://localhost:5000/register', values)
            .then(res => {
                if (res.data.Status === "Success") {
                    alert("Registered Successfully!");
                    // Redirect to dashboard and pass the barcode/data
                    navigate('/patient-dashboard', { state: { patient: res.data } });
                }
            })
            .catch(err => console.log(err));
    };

    return (
        <div className="register-container">
            <h2 style={{ color: '#007bff' }}>Patient Registration</h2>
            <p>Welcome to Kiribathgoda Hospital</p>

            {/* If showBarcode is empty, show the Form. Otherwise, show the Barcode image */}
            {!showBarcode ? (
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="First Name" required onChange={e => setValues({...values, first_name: e.target.value})} />
                    
                    <input type="text" placeholder="Middle Name" onChange={e => setValues({...values, mid_name: e.target.value})} />
                    
                    <input type="text" placeholder="Surname" required onChange={e => setValues({...values, surname: e.target.value})} />
                    
                    <label style={{display: 'block', textAlign: 'left', marginLeft: '10px'}}>Date of Birth:</label>
                    <input 
                        type="date" 
                        required 
                        onChange={e => {
                            const selectedDate = e.target.value;
                            const calculatedAge = calculateAge(selectedDate);
                            setValues({
                                ...values, 
                                dob: selectedDate, 
                                age: calculatedAge // Automatically sets the age
                            });
                        }} 
                    />
                    
                    <input 
                        type="number" 
                        placeholder="Age" 
                        value={values.age} 
                        readOnly 
                        style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }} 
                    />

                    <select required style={{width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px'}} 
                            onChange={e => setValues({...values, gender: e.target.value})}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                    
                    <input type="text" placeholder="Phone Number" required onChange={e => setValues({...values, phone: e.target.value})} />
                    
                    <input type="email" placeholder="Email Address" required onChange={e => setValues({...values, email: e.target.value})} />
                    
                    <textarea placeholder="Home Address" style={{width: '100%', padding: '12px', borderRadius: '6px'}} 
                            onChange={e => setValues({...values, address: e.target.value})}></textarea>
                    
                    <input type="password" placeholder="Create Password" required 
                        onChange={e => setValues({ ...values, password: e.target.value })} />
                    {/* Password Hint */}
                    <p style={{ fontSize: '11px', textAlign: 'left', color: values.password.length >= 8 ? 'green' : 'red', margin: '0 10px' }}>
                        * Minimum 8 characters, 1 uppercase, 1 number, 1 special char.
                    </p>

                    <input type="password" placeholder="Confirm Password" required 
                        onChange={e => setConfirmPassword(e.target.value)} />
                    
                    <button type="submit">Register & Get Barcode</button>
                
                </form>
            ) : (
                <div style={{ marginTop: '20px', padding: '20px', border: '2px dashed #007bff', background: 'white' }}>
                    <h4>Your Patient Barcode</h4>
                    <Barcode value={showBarcode} /> 
                    <p><strong>{showBarcode}</strong></p>
                    <p style={{ fontSize: '12px' }}>Please save or print this for hospital visits.</p>
                    <button onClick={() => window.print()}>Print Barcode</button>
                    <br />
                    <button onClick={() => setShowBarcode('')} style={{ marginTop: '10px', background: '#6c757d' }}>
                        Register Another Patient
                    </button>
                </div>
            )}
        </div>
    );
}

export default Register;