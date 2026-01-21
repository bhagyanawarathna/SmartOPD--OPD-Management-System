import React from 'react' 
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Register from './Register' 
import Login from './Login' 
import PatientDashboard from './PatientDashboard'

// Simple temporary Dashboards so the code doesn't break
const DoctorDashboard = () => <div style={{padding: '20px'}}><h2>Doctor Dashboard</h2><p>Welcome, Doctor!</p></div>;
const ReceptionDashboard = () => <div style={{padding: '20px'}}><h2>Receptionist Dashboard</h2><p>Welcome, Receptionist!</p></div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. This line makes Login the home page (localhost:5173/) */}
        <Route path='/' element={<Login />}></Route> 
        <Route path='/login' element={<Login />}></Route>
        <Route path='/register' element={<Register />}></Route>
        <Route path='/patient-dashboard' element={<PatientDashboard />} />
        <Route path='/doctor-dashboard' element={<DoctorDashboard />}></Route>
        <Route path='/reception-dashboard' element={<ReceptionDashboard />}></Route>
        <Route path='/admin-dashboard' element={<div>Admin Dashboard</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;