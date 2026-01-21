const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');

// 1. This line loads your .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 2. We use the variables from .env here
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT // This will now use 3307
});

db.connect((err) => {
    if (err) {
        console.error('Error! The Kitchen door is locked:', err.message);
    } else {
        console.log(' Success! Connected to the MySQL Kitchen on port ' + process.env.DB_PORT);
    }
});

app.get('/', (req, res) => {
    res.send("Chef is ready!");
});

// 3. We use the PORT for the Server (5000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Server is running on http://localhost:${PORT}`);
});

// registration part 

const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Set up Email "Postman" (Use your Gmail details)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bhagya0913@gmail.com', // Put your email here
        pass: 'qcekkubtinjecuaj'    // Put your Google App Password here
    }
});

app.post('/register', async (req, res) => {
    const { first_name, mid_name, surname, dob, gender, email, phone, address, age, password } = req.body;
    
    // 1. Hide the password (Security Rubric!)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 2. Generate a Unique Barcode ID
    const barcodeValue = "PAT-" + Math.floor(Math.random() * 1000000);

    // 3. Step One: Insert into 'patient' table
    const sqlPatient = "INSERT INTO patient (first_name, mid_name, surname, dob, gender, email, phone, address, age, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const dbValues = [first_name, mid_name, surname, dob, gender, email, phone, address, age, barcodeValue];
    
    db.query(sqlPatient, dbValues, (err, result) => {
        if (err) {
            console.log("❌ Patient Table Error:", err);
            return res.json({ Status: "Fail", Error: "Database Error: Could not save patient" });
        }

        const newPatientId = result.insertId; // Get the ID of the patient we just created

        // 4. Step Two: Insert into 'user_account' table (THIS ENABLES LOGIN)
        const sqlUser = "INSERT INTO user_account (patient_id, username, password_hash) VALUES (?, ?, ?)";
        db.query(sqlUser, [newPatientId, email, hashedPassword], (err, userResult) => {
            if (err) {
                console.log("❌ User Account Table Error:", err);
                // We don't stop the whole process, but we log the error
            }

            // 5. Step Three: Send the Welcome Email
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Kiribathgoda Hospital - Registration Success',
                html: `
                    <div style="font-family: Arial; border: 1px solid #007bff; padding: 20px; text-align: center; border-radius: 10px;">
                        <h2 style="color: #007bff;">Registration Successful!</h2>
                        <p>Hello <strong>${first_name}</strong>, thank you for registering at Kiribathgoda Hospital.</p>
                        <p>Your login email is: <strong>${email}</strong></p>
                        <p>Here is your official OPD Barcode:</p>
                        <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${barcodeValue}&scale=3&rotate=N&includetext" alt="Barcode" style="margin: 20px 0;"/>
                        <h3 style="background: #f0f0f0; padding: 10px;">ID: ${barcodeValue}</h3>
                        <p style="color: #555;">Please show this email at the reception desk.</p>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                // We send the "Success" response back to the browser here
                // We include all patient data so the frontend can show the dashboard immediately
                const responseData = { 
                    Status: "Success", 
                    Barcode: barcodeValue, 
                    first_name, 
                    surname, 
                    email, 
                    phone, 
                    address, 
                    age 
                };

                if (error) {
                    console.log("❌ Email Error:", error.message);
                    return res.json({ ...responseData, EmailStatus: "Failed to send email" });
                } else {
                    console.log("✅ Email sent: " + info.response);
                    return res.json({ ...responseData, EmailStatus: "Email Sent" });
                }
            });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    let sql = "";
    // 1. If user selects 'Patient', we search the patient table
    if (role === 'Patient') {
        sql = `
            SELECT u.password_hash, p.first_name, 'Patient' as role_name, p.barcode, p.surname, p.email, p.phone, p.address, p.age
            FROM user_account u
            JOIN patient p ON u.patient_id = p.patient_id
            WHERE p.email = ?
        `;
    } else {
        // 2. Otherwise, we search the staff and role tables
        sql = `
            SELECT u.password_hash, s.first_name, r.role_name 
            FROM user_account u
            JOIN staff s ON u.staff_id = s.staff_id
            JOIN staff_role sr ON s.staff_id = sr.staff_id
            JOIN role r ON sr.role_id = r.role_id
            WHERE s.email = ? AND r.role_name = ?
        `;
    }

    db.query(sql, [email, role === 'Patient' ? email : role], async (err, data) => {
        if (err) return res.json({ Status: "Error", Error: "Server Error" });
        
        if (data.length > 0) {
            const passwordMatch = await bcrypt.compare(password, data[0].password_hash);
            if (passwordMatch) {
                // Return 'data[0]' which contains all the patient details we need for the dashboard
                return res.json({ Status: "Success", Role: data[0].role_name, Data: data[0] });
            } else {
                return res.json({ Status: "Fail", Error: "Wrong Password" });
            }
        } else {
            return res.json({ Status: "Fail", Error: "User not found for this role" });
        }
    });
});