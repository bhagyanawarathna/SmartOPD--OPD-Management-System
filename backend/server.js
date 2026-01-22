const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// 1. CONFIGURATION
dotenv.config();
const app = express();
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err) => {
    if (err) {
        console.error(' Database Connection Failed:', err.message);
    } else {
        console.log(' Connected to MySQL Database on port ' + process.env.DB_PORT);
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bhagya0913@gmail.com',
        pass: 'qcekkubtinjecuaj'
    }
});

// 2. ROUTES

// Base Route
app.get('/', (req, res) => {
    res.send("SmartOPD Backend is Running...");
});

// UPDATE PROFILE ROUTE (The one you were missing/fixing)
app.post('/update-profile', (req, res) => {
    const {
        email, first_name, surname, phone, address,
        blood_group, allergies, chronic_diseases
    } = req.body;

    const sql = `UPDATE patient SET 
                 first_name = ?, surname = ?, phone = ?, address = ?, 
                 blood_group = ?, allergies = ?, chronic_diseases = ? 
                 WHERE email = ?`;

    const values = [first_name, surname, phone, address, blood_group, allergies, chronic_diseases, email];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Update Error:", err);
            return res.json({ Status: "Error", Error: err.message });
        }
        return res.json({ Status: "Success" });
    });
});

// FETCH PROFILE ROUTE
app.get('/patient-profile/:email', (req, res) => {
    const email = req.params.email;
    const sql = "SELECT * FROM patient WHERE email = ?";

    db.query(sql, [email], (err, data) => {
        if (err) return res.json({ Status: "Error", Error: err });
        if (data.length > 0) {
            return res.json({ Status: "Success", Data: data[0] });
        } else {
            return res.json({ Status: "Fail", Error: "Patient not found" });
        }
    });
});

// REGISTRATION ROUTE
app.post('/register', async (req, res) => {
    const { first_name, mid_name, surname, dob, gender, email, phone, address, age, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const barcodeValue = "PAT-" + Math.floor(Math.random() * 1000000);

    const sqlPatient = "INSERT INTO patient (first_name, mid_name, surname, dob, gender, email, phone, address, age, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const dbValues = [first_name, mid_name, surname, dob, gender, email, phone, address, age, barcodeValue];

    db.query(sqlPatient, dbValues, (err, result) => {
        if (err) {
            console.log("❌ Patient Table Error:", err);
            return res.json({ Status: "Fail", Error: "Database Error" });
        }

        const newPatientId = result.insertId;
        const sqlUser = "INSERT INTO user_account (patient_id, username, password_hash) VALUES (?, ?, ?)";

        db.query(sqlUser, [newPatientId, email, hashedPassword], (err, userResult) => {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Kiribathgoda Hospital - Registration Success',
                html: `<h2 style="color: #007bff;">Registration Successful!</h2><p>ID: ${barcodeValue}</p>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                return res.json({ Status: "Success", Barcode: barcodeValue, first_name, email });
            });
        });
    });
});

// LOGIN ROUTE
app.post('/login', (req, res) => {
    const { email, password, role } = req.body;
    let sql = "";

    if (role === 'Patient') {
        sql = `SELECT u.password_hash, p.patient_id, p.first_name, 'Patient' as role_name, p.barcode, p.surname, p.email, p.phone, p.address, p.age
           FROM user_account u
           JOIN patient p ON u.patient_id = p.patient_id
           WHERE p.email = ?`;
    } else {
        sql = `SELECT u.password_hash, s.first_name, r.role_name 
               FROM user_account u
               JOIN staff s ON u.staff_id = s.staff_id
               JOIN staff_role sr ON s.staff_id = sr.staff_id
               JOIN role r ON sr.role_id = r.role_id
               WHERE s.email = ? AND r.role_name = ?`;
    }

    db.query(sql, [email, role === 'Patient' ? email : role], async (err, data) => {
        if (err) return res.json({ Status: "Error", Error: "Server Error" });
        if (data.length > 0) {
            const passwordMatch = await bcrypt.compare(password, data[0].password_hash);
            if (passwordMatch) {
                return res.json({ Status: "Success", Role: data[0].role_name, Data: data[0] });
            } else {
                return res.json({ Status: "Fail", Error: "Wrong Password" });
            }
        } else {
            return res.json({ Status: "Fail", Error: "User not found" });
        }
    });
});

// --- APPOINTMENT SYSTEM ROUTES ---

// 1. Fetch Patient Appointments
app.get('/my-appointments/:patient_id', (req, res) => {
    const sql = `SELECT * FROM appointment WHERE patient_id = ? ORDER BY appointment_day DESC`;
    db.query(sql, [req.params.patient_id], (err, data) => {
        if (err) return res.json({ Status: "Error", Error: err });
        return res.json({ Status: "Success", Data: data });
    });
});

// 2. Book Appointment with Quota Validation
app.post('/book-appointment', (req, res) => {
    // Standardize the date to YYYY-MM-DD
    const { patient_id } = req.body;
    const appointment_day = req.body.appointment_day ? req.body.appointment_day.split('T')[0] : null;

    if (!patient_id || !appointment_day) {
        return res.json({ Status: "Error", Message: "User ID or Date missing." });
    }

    // 1. Get the current daily quota
    const quotaSql = "SELECT daily_quota FROM system_setting ORDER BY updated_at DESC LIMIT 1";

    db.query(quotaSql, (err, settings) => {
        if (err) {
            console.error("Database Error (Settings):", err);
            return res.json({ Status: "Error", Message: "Internal Server Error" });
        }
        if (settings.length === 0) {
            return res.json({ Status: "Error", Message: "Daily limit not configured by admin." });
        }

        const limit = settings[0].daily_quota;

        // 2. Check current bookings
        const countSql = "SELECT COUNT(*) as current_count FROM appointment WHERE appointment_day = ? AND status != 'cancelled'";

        db.query(countSql, [appointment_day], (err, result) => {
            // Safety check: handle count query error
            if (err) {
                console.error("Database Error (Count):", err);
                return res.json({ Status: "Error", Message: "Could not verify availability." });
            }

            const count = result[0].current_count;

            if (count >= limit) {
                return res.json({ Status: "Full", Message: "Apologies, this day is fully booked." });
            }

            const nextQueueNo = count + 1;

            // 3. Insert the booking
            const insertSql = `INSERT INTO appointment (patient_id, appointment_day, queue_no, status) VALUES (?, ?, ?, 'booked')`;

            db.query(insertSql, [patient_id, appointment_day, nextQueueNo], (err, data) => {
                if (err) {
                    console.error("Database Error (Insert):", err);
                    return res.json({ Status: "Error", Message: "Failed to save appointment." });
                }

                // 4. Calculate estimated time
                const totalMins = count * 10;
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                const arrivalHour = 8 + hours;
                const estArrival = `${arrivalHour}:${mins === 0 ? '00' : mins < 10 ? '0' + mins : mins} AM`;

                return res.json({
                    Status: "Success",
                    QueueNo: nextQueueNo,
                    EstimatedTime: estArrival
                });
            });
        });
    });
});

// 3. Cancel Appointment
app.post('/cancel-appointment', (req, res) => {
    const { appointment_id } = req.body;
    const sql = "UPDATE appointment SET status = 'cancelled' WHERE appointment_id = ?";
    db.query(sql, [appointment_id], (err, result) => {
        if (err) return res.json({ Status: "Error", Error: err });
        return res.json({ Status: "Success" });
    });
});

// FETCH MEDICAL RECORDS (Treatment + Prescriptions)
app.get('/medical-history/:patient_id', (req, res) => {
    const sql = `
        SELECT tr.*, p.details as prescription_details, s.surname as doctor_name 
        FROM treatment_record tr
        JOIN appointment a ON tr.appointment_id = a.appointment_id
        LEFT JOIN prescription p ON a.appointment_id = p.appointment_id
        LEFT JOIN staff s ON tr.created_by = s.staff_id
        WHERE a.patient_id = ? ORDER BY tr.consultation_day DESC`;

    db.query(sql, [req.params.patient_id], (err, data) => {
        if (err) return res.json({ Status: "Error", Error: err });
        return res.json({ Status: "Success", Data: data });
    });
});

// SUBMIT FEEDBACK

app.post('/submit-feedback', (req, res) => {
    const { patient_id, comments } = req.body;

    // Check if data is actually arriving
    if (!patient_id || !comments) {
        return res.json({ Status: "Error", Message: "Feedback cannot be empty." });
    }

    // In your schema, the column is 'comments'
    const sql = "INSERT INTO feedback (patient_id, comments) VALUES (?, ?)";

    db.query(sql, [patient_id, comments], (err, result) => {
        if (err) {
            console.error("Feedback SQL Error:", err);
            return res.json({ Status: "Error", Message: "Database error." });
        }
        return res.json({ Status: "Success" });
    });
});

// FETCH FEEDBACK HISTORY
app.get('/my-feedback/:patient_id', (req, res) => {
    const patient_id = req.params.patient_id;
    const sql = "SELECT * FROM feedback WHERE patient_id = ? ORDER BY date_submitted DESC";
    
    db.query(sql, [patient_id], (err, data) => {
        if (err) {
            console.error("Fetch Feedback Error:", err);
            return res.json({ Status: "Error", Message: "Internal Server Error" });
        }
        return res.json({ Status: "Success", Data: data });
    });
});

// FETCH NOTIFICATIONS
app.get('/notifications/:patient_id', (req, res) => {
    const sql = "SELECT * FROM notification WHERE patient_id = ? ORDER BY sent_time DESC";
    db.query(sql, [req.params.patient_id], (err, data) => {
        if (err) return res.json({ Status: "Error", Error: err });
        return res.json({ Status: "Success", Data: data });
    });
});

// 3. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Server is running on http://localhost:${PORT}`);
});