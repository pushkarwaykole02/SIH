import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pkg from 'pg';
import nodemailer from 'nodemailer';
const { Pool } = pkg;
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, DOC, and DOCX files are allowed'));
    }
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Use DATABASE_URL (Postgres connection string) from Supabase
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("WARNING: DATABASE_URL not set. The server will start but DB operations will fail until you set it.");
}
const pool = new Pool({ connectionString });

// On startup create alumni table if not exists
async function ensureTables() {
  if (!connectionString) return;
  const createAlumni = `
  CREATE TABLE IF NOT EXISTS alumni (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    degree TEXT,
    graduation_year INTEGER,
    department TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    linkedin TEXT,
    github TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT now()
  );
  `;

  const createEvents = `
  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_name TEXT NOT NULL,
    event_description TEXT NOT NULL,
    event_venue TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    created_by TEXT DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
  );
  `;

  try {
    await pool.query(createAlumni);
    await pool.query(createEvents);
    console.log("Ensured tables exist.");
  } catch (err) {
    console.error("Error creating tables:", err.message);
  }
}

ensureTables();

// ================= EMAIL CONFIGURATION ================= //
const emailUser = process.env.EMAIL_USER || 'pushkarwaykole73@gmail.com';
const emailPass = process.env.EMAIL_PASS || 'your-app-password';

console.log('Email Configuration:');
console.log('EMAIL_USER:', emailUser);
console.log('EMAIL_PASS:', emailPass ? '***SET***' : '***NOT SET***');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

// Test email connection
async function testEmailConnection() {
  try {
    await transporter.verify();
    console.log('✅ Email server connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    return false;
  }
}

// Email helper function with enhanced error handling
async function sendEmail(to, subject, htmlContent) {
  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    
    const mailOptions = {
      from: emailUser,
      to: to,
      subject: subject,
      html: htmlContent
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', to, 'Message ID:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending email to:', to);
    console.error('❌ Error details:', error.message);
    if (error.code) {
      console.error('❌ Error code:', error.code);
    }
    return false;
  }
}

// ================= API ROUTES ================= //

// Register alumni with file upload
app.post('/api/register', upload.single('document'), async (req, res) => {
  const {
    name, email, password, phone, degree, graduation_year, department,
    address, city, state, country, linkedin, github
  } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'name, email and password required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Document proof is required' });
  }

  try {
    const q = `
      INSERT INTO alumni (
        name, email, password, phone, degree, graduation_year, department,
        address, city, state, country, linkedin, github, document_path, document_original_name, status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )
      RETURNING *;
    `;
    const vals = [
      name, email, password, phone, degree,
      graduation_year || null, department, address,
      city, state, country, linkedin, github,
      req.file.path, req.file.originalname, 'pending'
    ];
    const r = await pool.query(q, vals);
    res.json({ success: true, alumni: r.rows[0] });
  } catch (err) {
    console.error(err);
    // If database insert fails, delete the uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

// Get alumni by email (for login / dashboard)
app.get('/api/alumni', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const r = await pool.query('SELECT * FROM alumni WHERE email=$1', [email]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update alumni profile
app.put('/api/alumni/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    name, phone, degree, graduation_year, department, 
    address, city, state, country, linkedin, github 
  } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE alumni SET 
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        degree = COALESCE($3, degree),
        graduation_year = COALESCE($4, graduation_year),
        department = COALESCE($5, department),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        country = COALESCE($9, country),
        linkedin = COALESCE($10, linkedin),
        github = COALESCE($11, github)
      WHERE id = $12 
      RETURNING *`,
      [name, phone, degree, graduation_year, department, address, city, state, country, linkedin, github, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      alumni: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating alumni profile:', err);
    console.error('Error details:', err.message);
    console.error('SQL error code:', err.code);
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: err.message 
    });
  }
});

// Admin: list pending requests
app.get('/api/admin/pending', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM alumni WHERE status='pending' ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get document for a specific alumni
app.get('/api/admin/document/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const r = await pool.query("SELECT document_path, document_original_name FROM alumni WHERE id=$1", [id]);
    if (r.rowCount === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    const alumni = r.rows[0];
    if (!alumni.document_path) {
      return res.status(404).json({ error: 'No document found' });
    }
    
    // Check if file exists
    if (!fs.existsSync(alumni.document_path)) {
      return res.status(404).json({ error: 'Document file not found' });
    }
    
    // Send the file
    res.download(alumni.document_path, alumni.document_original_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin approve/decline
app.post('/api/admin/:id/approve', async (req, res) => {
  const id = req.params.id;
  try {
    // Get alumni data before updating
    const alumniResult = await pool.query("SELECT * FROM alumni WHERE id=$1", [id]);
    if (alumniResult.rowCount === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    
    const alumni = alumniResult.rows[0];
    
    // Update status
    await pool.query("UPDATE alumni SET status='approved' WHERE id=$1", [id]);
    
    // Send approval email
    const approvalEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fb8500, #f97316); color: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your AlumniConnect account has been approved!</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #0f172a; margin-top: 0;">Welcome to AlumniConnect, ${alumni.name}!</h2>
          
          <p style="color: #475569; line-height: 1.6;">Your registration has been successfully verified and your account is now active. You can now:</p>
          
          <ul style="color: #475569; line-height: 1.8;">
            <li>✅ Access your alumni dashboard</li>
            <li>✅ Connect with fellow alumni</li>
            <li>✅ Participate in events and networking</li>
            <li>✅ Explore job opportunities</li>
            <li>✅ Share memories and stories</li>
          </ul>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0f172a; margin-top: 0;">Your Details:</h3>
            <p style="margin: 5px 0; color: #475569;"><strong>Name:</strong> ${alumni.name}</p>
            <p style="margin: 5px 0; color: #475569;"><strong>Degree:</strong> ${alumni.degree}</p>
            <p style="margin: 5px 0; color: #475569;"><strong>Graduation Year:</strong> ${alumni.graduation_year}</p>
            <p style="margin: 5px 0; color: #475569;"><strong>Department:</strong> ${alumni.department}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
               style="background: #fb8500; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Login to Your Dashboard
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
            If you have any questions, feel free to contact us at pushkarwaykole73@gmail.com
          </p>
        </div>
      </div>
    `;
    
    await sendEmail(alumni.email, '🎉 Welcome to AlumniConnect - Account Approved!', approvalEmailHtml);
    
    res.json({ success: true, message: 'Alumni approved and email sent' });
  } catch (err) {
    console.error('Error approving alumni:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/:id/decline', async (req, res) => {
  const id = req.params.id;
  try {
    // Get alumni data before updating
    const alumniResult = await pool.query("SELECT * FROM alumni WHERE id=$1", [id]);
    if (alumniResult.rowCount === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    
    const alumni = alumniResult.rows[0];
    
    // Update status
    await pool.query("UPDATE alumni SET status='declined' WHERE id=$1", [id]);
    
    // Send decline email
    const declineEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fee2e2; color: #dc2626; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📋 Registration Update</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your AlumniConnect registration requires attention</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #0f172a; margin-top: 0;">Dear ${alumni.name},</h2>
          
          <p style="color: #475569; line-height: 1.6;">We regret to inform you that your AlumniConnect registration could not be approved at this time. This may be due to:</p>
          
          <ul style="color: #475569; line-height: 1.8;">
            <li>📄 Document verification issues</li>
            <li>📧 Incomplete information</li>
            <li>🎓 Degree verification requirements</li>
            <li>📋 Additional documentation needed</li>
          </ul>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">What's Next?</h3>
            <p style="margin: 5px 0; color: #92400e;">You can reapply with the correct documentation or contact our support team for assistance.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:pushkarwaykole73@gmail.com" 
               style="background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
              Contact Support
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/register" 
               style="background: #fb8500; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Reapply Now
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
            For any questions or assistance, please contact us at pushkarwaykole73@gmail.com
          </p>
        </div>
      </div>
    `;
    
    await sendEmail(alumni.email, '📋 AlumniConnect Registration Update', declineEmailHtml);
    
    res.json({ success: true, message: 'Alumni declined and email sent' });
  } catch (err) {
    console.error('Error declining alumni:', err);
    res.status(500).json({ error: err.message });
  }
});

// FORGOT PASSWORD endpoint
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Check if alumni exists
    const alumniResult = await pool.query("SELECT * FROM alumni WHERE email=$1", [email]);
    if (alumniResult.rowCount === 0) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }
    
    const alumni = alumniResult.rows[0];
    
    // Generate a simple reset token (in production, use crypto.randomBytes)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store reset token in database (you might want to add a reset_tokens table)
    // For now, we'll just send the email
    
    // Send password reset email
    const resetEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fb8500, #f97316); color: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Reset your AlumniConnect password</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #0f172a; margin-top: 0;">Hello ${alumni.name}!</h2>
          
          <p style="color: #475569; line-height: 1.6;">You requested a password reset for your AlumniConnect account. Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}" 
               style="background: #fb8500; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0f172a; margin-top: 0;">Security Information:</h3>
            <ul style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>This link will expire in 24 hours</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password will remain unchanged until you click the link</li>
            </ul>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="word-break: break-all; color: #3b82f6;">
              ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}
            </span>
          </p>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
            For any questions, contact us at pushkarwaykole73@gmail.com
          </p>
        </div>
      </div>
    `;
    
    await sendEmail(email, '🔐 AlumniConnect Password Reset', resetEmailHtml);
    
    res.json({ success: true, message: 'Password reset email sent successfully' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// LOGIN endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // Hardcoded admin check
  if (email === 'admin@admin.com' && password === 'admin') {
    return res.json({ role: 'admin' });
  }

  try {
    const q = 'SELECT * FROM alumni WHERE email=$1 AND password=$2';
    const r = await pool.query(q, [email, password]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ role: 'alumni', alumni: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= EVENT API ENDPOINTS ================= //

// Function to get all approved alumni emails
async function getApprovedAlumniEmails() {
  try {
    const result = await pool.query("SELECT email, name FROM alumni WHERE status = 'approved'");
    return result.rows;
  } catch (err) {
    console.error('Error fetching approved alumni emails:', err);
    return [];
  }
}

// Function to send event notification emails to all alumni
async function sendEventNotificationEmails(eventData) {
  console.log('🔍 Fetching approved alumni list...');
  const alumniList = await getApprovedAlumniEmails();
  
  console.log(`📊 Found ${alumniList.length} approved alumni`);
  if (alumniList.length === 0) {
    console.log('⚠️ No approved alumni found to send notifications to');
    return { successful: 0, failed: 0, message: 'No approved alumni found' };
  }
  
  console.log('📧 Alumni list:', alumniList.map(a => `${a.name} (${a.email})`));

  const eventDate = new Date(eventData.event_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const eventTime = eventData.event_time ? new Date(`2000-01-01T${eventData.event_time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : 'Time TBD';

  const emailPromises = alumniList.map(async (alumni) => {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fb8500, #f97316); color: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 New Event Alert!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">AlumniConnect has a new event for you</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #0f172a; margin-top: 0;">Dear ${alumni.name},</h2>
          
          <p style="color: #475569; line-height: 1.6;">We're excited to announce a new event in our AlumniConnect community!</p>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fb8500;">
            <h3 style="color: #fb8500; margin-top: 0; font-size: 24px;">${eventData.event_name}</h3>
            <p style="color: #475569; margin: 10px 0; line-height: 1.6;">${eventData.event_description}</p>
            
            <div style="margin-top: 20px;">
              <div style="display: flex; align-items: center; margin: 10px 0; color: #374151;">
                <span style="font-weight: 600; margin-right: 10px;">📅 Date:</span>
                <span>${eventDate}</span>
              </div>
              <div style="display: flex; align-items: center; margin: 10px 0; color: #374151;">
                <span style="font-weight: 600; margin-right: 10px;">🕒 Time:</span>
                <span>${eventTime}</span>
              </div>
              <div style="display: flex; align-items: center; margin: 10px 0; color: #374151;">
                <span style="font-weight: 600; margin-right: 10px;">📍 Venue:</span>
                <span>${eventData.event_venue}</span>
              </div>
            </div>
          </div>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e40af; margin-top: 0;">Why You Should Attend</h3>
            <ul style="color: #1e40af; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>🤝 Network with fellow alumni</li>
              <li>💡 Learn from industry experts</li>
              <li>🎯 Discover new opportunities</li>
              <li>🌟 Strengthen your alumni connections</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:pushkarwaykole73@gmail.com" 
               style="background: #fb8500; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
              Contact Organizers
            </a>
            <a href="https://your-alumni-portal.com" 
               style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              View All Events
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
            We look forward to seeing you there!<br>
            <strong>AlumniConnect Team</strong>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p>This email was sent to all AlumniConnect members. If you no longer wish to receive event notifications, please contact us.</p>
        </div>
      </div>
    `;

    return sendEmail(alumni.email, `🎉 New Event: ${eventData.event_name}`, emailHtml);
  });

  try {
    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - successful;
    
    console.log(`Event notification emails sent: ${successful} successful, ${failed} failed`);
    return { successful, failed };
  } catch (err) {
    console.error('Error sending event notification emails:', err);
    return { successful: 0, failed: alumniList.length };
  }
}

// Create event
app.post('/api/events', async (req, res) => {
  const { event_name, event_description, event_venue, event_date, event_time } = req.body;
  
  try {
    const result = await pool.query(
      "INSERT INTO events (event_name, event_description, event_venue, event_date, event_time) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [event_name, event_description, event_venue, event_date, event_time]
    );
    
    const newEvent = result.rows[0];
    
    // Send email notifications to all approved alumni
    console.log('Sending event notification emails...');
    const emailResults = await sendEventNotificationEmails(newEvent);
    console.log('Email notification results:', emailResults);
    
    res.json({ 
      success: true, 
      event: newEvent,
      emailNotifications: emailResults
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM events ORDER BY event_date ASC, event_time ASC");
    res.json({ success: true, events: result.rows });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get events by date
app.get('/api/events/date/:date', async (req, res) => {
  const { date } = req.params;
  
  try {
    const result = await pool.query("SELECT * FROM events WHERE event_date = $1 ORDER BY event_time ASC", [date]);
    res.json({ success: true, events: result.rows });
  } catch (err) {
    console.error('Error fetching events by date:', err);
    res.status(500).json({ error: 'Failed to fetch events by date' });
  }
});

// Get single event by ID
app.get('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query("SELECT * FROM events WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true, event: result.rows[0] });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { event_name, event_description, event_venue, event_date, event_time } = req.body;
  
  try {
    const result = await pool.query(
      "UPDATE events SET event_name = $1, event_description = $2, event_venue = $3, event_date = $4, event_time = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *",
      [event_name, event_description, event_venue, event_date, event_time, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ success: true, event: result.rows[0] });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Get all alumni emails (for debugging purposes)
app.get('/api/alumni/emails', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, status FROM alumni ORDER BY status, name");
    res.json({ 
      success: true, 
      alumni: result.rows,
      total: result.rows.length,
      approved: result.rows.filter(alumni => alumni.status === 'approved').length
    });
  } catch (err) {
    console.error('Error fetching alumni emails:', err);
    res.status(500).json({ error: 'Failed to fetch alumni emails' });
  }
});

// Test email connection endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    console.log('Testing email connection...');
    const isConnected = await testEmailConnection();
    
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'Email connection successful',
        emailUser: emailUser,
        emailPassSet: !!emailPass && emailPass !== 'your-app-password'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Email connection failed',
        emailUser: emailUser,
        emailPassSet: !!emailPass && emailPass !== 'your-app-password'
      });
    }
  } catch (err) {
    console.error('Error testing email connection:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test email connection',
      details: err.message
    });
  }
});

// Simple test endpoint to check everything
app.get('/api/quick-debug', async (req, res) => {
  try {
    // Check alumni
    const allAlumni = await pool.query("SELECT id, name, email, status FROM alumni");
    const approvedAlumni = allAlumni.rows.filter(a => a.status === 'approved');
    
    // Check email config
    const emailConfig = {
      user: emailUser,
      passSet: !!emailPass && emailPass !== 'your-app-password'
    };
    
    // Test email connection
    let emailConnected = false;
    try {
      await transporter.verify();
      emailConnected = true;
    } catch (err) {
      console.log('Email connection failed:', err.message);
    }
    
    res.json({
      success: true,
      debug: {
        totalAlumni: allAlumni.rows.length,
        approvedAlumni: approvedAlumni.length,
        alumniList: allAlumni.rows.map(a => ({
          name: a.name,
          email: a.email,
          status: a.status
        })),
        emailConfig: emailConfig,
        emailConnected: emailConnected
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Debug event notification endpoint
app.post('/api/debug-event-notifications', async (req, res) => {
  try {
    console.log('🔍 Debug: Starting event notification debug...');
    
    // Step 1: Check if we have approved alumni
    const alumniList = await getApprovedAlumniEmails();
    console.log('🔍 Debug: Approved alumni count:', alumniList.length);
    console.log('🔍 Debug: Alumni list:', alumniList);
    
    if (alumniList.length === 0) {
      return res.json({
        success: false,
        message: 'No approved alumni found',
        debug: {
          alumniCount: 0,
          alumniList: [],
          emailConfig: {
            user: emailUser,
            passSet: !!emailPass && emailPass !== 'your-app-password'
          }
        }
      });
    }
    
    // Step 2: Test email connection
    const emailConnected = await testEmailConnection();
    console.log('🔍 Debug: Email connection test:', emailConnected);
    
    // Step 3: Try sending to first alumni only
    const testAlumni = alumniList[0];
    console.log('🔍 Debug: Testing email to:', testAlumni.email);
    
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fb8500, #f97316); color: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🧪 Debug Test</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Event Notification Debug Test</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #0f172a; margin-top: 0;">Debug Test Email</h2>
          <p style="color: #475569; line-height: 1.6;">This is a debug test to verify the event notification system is working.</p>
          <p style="color: #475569; line-height: 1.6;">If you receive this email, the system is working correctly!</p>
        </div>
      </div>
    `;
    
    const emailSent = await sendEmail(testAlumni.email, '🧪 Debug: Event Notification Test', testHtml);
    console.log('🔍 Debug: Email sent result:', emailSent);
    
    res.json({
      success: true,
      message: 'Debug test completed',
      debug: {
        alumniCount: alumniList.length,
        alumniList: alumniList.map(a => ({ name: a.name, email: a.email })),
        emailConnected: emailConnected,
        testEmailSent: emailSent,
        testEmailTo: testAlumni.email,
        emailConfig: {
          user: emailUser,
          passSet: !!emailPass && emailPass !== 'your-app-password'
        }
      }
    });
    
  } catch (err) {
    console.error('🔍 Debug: Error in debug test:', err);
    res.status(500).json({
      success: false,
      error: 'Debug test failed',
      details: err.message
    });
  }
});

// Send test email endpoint
app.post('/api/send-test-email', async (req, res) => {
  const { to, subject, message } = req.body;
  
  if (!to) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fb8500, #f97316); color: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🧪 Test Email</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">AlumniConnect Email System Test</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #0f172a; margin-top: 0;">Email System Test</h2>
          
          <p style="color: #475569; line-height: 1.6;">This is a test email to verify that the AlumniConnect email notification system is working correctly.</p>
          
          ${message ? `<p style="color: #475569; line-height: 1.6;"><strong>Custom Message:</strong> ${message}</p>` : ''}
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="color: #166534; margin-top: 0;">✅ Email System Status</h3>
            <p style="margin: 5px 0; color: #166534;">If you received this email, the notification system is working properly!</p>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
            <strong>AlumniConnect Team</strong>
          </p>
        </div>
      </div>
    `;

    const emailSubject = subject || '🧪 AlumniConnect Email System Test';
    const success = await sendEmail(to, emailSubject, testHtml);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        to: to,
        subject: emailSubject
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send test email',
        to: to
      });
    }
  } catch (err) {
    console.error('Error sending test email:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test email',
      details: err.message
    });
  }
});

// Test endpoint to send event notification emails (for testing purposes)
app.post('/api/events/test-notifications', async (req, res) => {
  const { event_name, event_description, event_venue, event_date, event_time } = req.body;
  
  if (!event_name || !event_description || !event_venue || !event_date) {
    return res.status(400).json({ error: 'Missing required event fields' });
  }

  try {
    const testEvent = {
      event_name,
      event_description,
      event_venue,
      event_date,
      event_time: event_time || null
    };

    console.log('Testing event notification emails...');
    const emailResults = await sendEventNotificationEmails(testEvent);
    console.log('Test email notification results:', emailResults);
    
    res.json({ 
      success: true, 
      message: 'Test email notifications sent',
      emailNotifications: emailResults
    });
  } catch (err) {
    console.error('Error sending test event notification emails:', err);
    res.status(500).json({ error: 'Failed to send test notifications' });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query("DELETE FROM events WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ============================================== //

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port', PORT));
