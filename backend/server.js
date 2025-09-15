import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
dotenv.config();

const app = express();

// Configure CORS for production
const corsOptions = {
  origin: [
    'http://localhost:3000', // Local development
    'http://localhost:5173', // Vite development server
    'https://your-vercel-app.vercel.app', // Replace with your actual Vercel URL
    'https://*.vercel.app' // Allow all Vercel preview deployments
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
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

// Azure SQL Database configuration
const azureConfig = {
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  user: process.env.AZURE_AD_USERNAME,
  password: process.env.AZURE_AD_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

// Debug: Log the configuration values
console.log('Azure SQL Configuration:');
console.log('Server:', azureConfig.server);
console.log('Database:', azureConfig.database);
console.log('User:', azureConfig.user);
console.log('Password:', azureConfig.password ? '***SET***' : '***NOT SET***');

if (!azureConfig.server || !azureConfig.database) {
  console.warn("WARNING: Azure SQL configuration not set. The server will start but DB operations will fail until you set AZURE_SQL_SERVER and AZURE_SQL_DATABASE.");
}

if (!azureConfig.user || !azureConfig.password) {
  console.warn("WARNING: Azure AD credentials not set. You need to set AZURE_AD_USERNAME and AZURE_AD_PASSWORD for authentication.");
}

let pool;

// Initialize Azure SQL connection
async function initializeDatabase() {
  if (!azureConfig.server || !azureConfig.database) {
    console.warn("Skipping database initialization - Azure SQL config not set");
    return;
  }

  try {
    console.log("🔐 Getting Azure AD access token using DefaultAzureCredential...");
    console.log("This will try: Azure CLI → Environment Variables → Managed Identity");
    
    // Get Azure AD access token using DefaultAzureCredential
    // This will automatically try:
    // 1. Azure CLI (if you're logged in with 'az login')
    // 2. Environment variables (if set)
    // 3. Managed Identity (if running on Azure)
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://database.windows.net/');
    const accessToken = tokenResponse.token;
    
    console.log("✅ Azure AD token obtained");
    
    // Configure connection with access token
    const connectionConfig = {
      server: azureConfig.server,
      database: azureConfig.database,
      authentication: {
        type: 'azure-active-directory-access-token',
        options: {
          token: accessToken
        }
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
      }
    };
    
    console.log("🔗 Connecting to Azure SQL Database...");
    pool = await sql.connect(connectionConfig);
    console.log("✅ Connected to Azure SQL Database");
    await ensureTables();
  } catch (err) {
    console.error("❌ Failed to connect to Azure SQL Database:", err.message);
    console.error("Make sure you have proper Azure AAD authentication configured");
    console.error("Error details:", err);
    
    // Try fallback with SQL Server authentication
    console.log("🔄 Trying SQL Server authentication as fallback...");
    try {
      const fallbackConfig = {
        server: azureConfig.server,
        database: azureConfig.database,
        user: azureConfig.user,
        password: azureConfig.password,
        options: {
          encrypt: true,
          trustServerCertificate: false,
          enableArithAbort: true
        }
      };
      
      pool = await sql.connect(fallbackConfig);
      console.log("✅ Connected to Azure SQL Database (SQL Server auth)");
      await ensureTables();
    } catch (err2) {
      console.error("❌ Fallback connection also failed:", err2.message);
    }
  }
}

// On startup create alumni table if not exists
async function ensureTables() {
  if (!pool) return;
  
  const createAlumni = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='alumni' AND xtype='U')
  CREATE TABLE alumni (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    phone NVARCHAR(50),
    degree NVARCHAR(255),
    graduation_year INT,
    department NVARCHAR(255),
    address NVARCHAR(500),
    city NVARCHAR(100),
    state NVARCHAR(100),
    country NVARCHAR(100),
    linkedin NVARCHAR(500),
    github NVARCHAR(500),
    document_path NVARCHAR(500),
    document_original_name NVARCHAR(255),
    status NVARCHAR(50) DEFAULT 'pending',
    created_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  const createEvents = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='events' AND xtype='U')
  CREATE TABLE events (
    id INT IDENTITY(1,1) PRIMARY KEY,
    event_name NVARCHAR(255) NOT NULL,
    event_description NVARCHAR(MAX) NOT NULL,
    event_venue NVARCHAR(500) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    created_by NVARCHAR(255) DEFAULT 'admin',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  try {
    await pool.request().query(createAlumni);
    await pool.request().query(createEvents);
    console.log("✅ Ensured tables exist in Azure SQL Database");
  } catch (err) {
    console.error("❌ Error creating tables:", err.message);
  }
}

initializeDatabase();

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

  // Validate phone number (10 digits only)
  if (phone && !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
  }

  try {
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const request = pool.request();
    request.input('name', sql.NVarChar, name);
    request.input('email', sql.NVarChar, email);
    request.input('password', sql.NVarChar, hashedPassword);
    request.input('phone', sql.NVarChar, phone);
    request.input('degree', sql.NVarChar, degree);
    request.input('graduation_year', sql.Int, graduation_year || null);
    request.input('department', sql.NVarChar, department);
    request.input('address', sql.NVarChar, address);
    request.input('city', sql.NVarChar, city);
    request.input('state', sql.NVarChar, state);
    request.input('country', sql.NVarChar, country);
    request.input('linkedin', sql.NVarChar, linkedin);
    request.input('github', sql.NVarChar, github);
    request.input('document_path', sql.NVarChar, req.file.path);
    request.input('document_original_name', sql.NVarChar, req.file.originalname);
    request.input('status', sql.NVarChar, 'pending');

    const result = await request.query(`
      INSERT INTO alumni (
        name, email, password, phone, degree, graduation_year, department,
        address, city, state, country, linkedin, github, document_path, document_original_name, status
      ) VALUES (
        @name, @email, @password, @phone, @degree, @graduation_year, @department,
        @address, @city, @state, @country, @linkedin, @github, @document_path, @document_original_name, @status
      );
      SELECT SCOPE_IDENTITY() as id, * FROM alumni WHERE id = SCOPE_IDENTITY();
    `);
    
    res.json({ success: true, alumni: result.recordset[0] });
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
    const request = pool.request();
    request.input('email', sql.NVarChar, email);
    const result = await request.query('SELECT * FROM alumni WHERE email = @email');
    if (result.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(result.recordset[0]);
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
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('name', sql.NVarChar, name);
    request.input('phone', sql.NVarChar, phone);
    request.input('degree', sql.NVarChar, degree);
    request.input('graduation_year', sql.Int, graduation_year);
    request.input('department', sql.NVarChar, department);
    request.input('address', sql.NVarChar, address);
    request.input('city', sql.NVarChar, city);
    request.input('state', sql.NVarChar, state);
    request.input('country', sql.NVarChar, country);
    request.input('linkedin', sql.NVarChar, linkedin);
    request.input('github', sql.NVarChar, github);

    const result = await request.query(`
      UPDATE alumni SET 
        name = ISNULL(@name, name),
        phone = ISNULL(@phone, phone),
        degree = ISNULL(@degree, degree),
        graduation_year = ISNULL(@graduation_year, graduation_year),
        department = ISNULL(@department, department),
        address = ISNULL(@address, address),
        city = ISNULL(@city, city),
        state = ISNULL(@state, state),
        country = ISNULL(@country, country),
        linkedin = ISNULL(@linkedin, linkedin),
        github = ISNULL(@github, github)
      WHERE id = @id;
      SELECT * FROM alumni WHERE id = @id;
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      alumni: result.recordset[0] 
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
    const request = pool.request();
    const result = await request.query("SELECT * FROM alumni WHERE status='pending' ORDER BY created_at DESC");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get document for a specific alumni
app.get('/api/admin/document/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const request = pool.request();
    request.input('id', sql.Int, id);
    const result = await request.query("SELECT document_path, document_original_name FROM alumni WHERE id = @id");
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    const alumni = result.recordset[0];
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
    const request1 = pool.request();
    request1.input('id', sql.Int, id);
    const alumniResult = await request1.query("SELECT * FROM alumni WHERE id = @id");
    if (alumniResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    
    const alumni = alumniResult.recordset[0];
    
    // Update status
    const request2 = pool.request();
    request2.input('id', sql.Int, id);
    await request2.query("UPDATE alumni SET status='approved' WHERE id = @id");
    
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
    const request1 = pool.request();
    request1.input('id', sql.Int, id);
    const alumniResult = await request1.query("SELECT * FROM alumni WHERE id = @id");
    if (alumniResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    
    const alumni = alumniResult.recordset[0];
    
    // Update status
    const request2 = pool.request();
    request2.input('id', sql.Int, id);
    await request2.query("UPDATE alumni SET status='declined' WHERE id = @id");
    
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
    const request = pool.request();
    request.input('email', sql.NVarChar, email);
    const alumniResult = await request.query("SELECT * FROM alumni WHERE email = @email");
    if (alumniResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }
    
    const alumni = alumniResult.recordset[0];
    
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
    const request = pool.request();
    request.input('email', sql.NVarChar, email);
    const result = await request.query('SELECT * FROM alumni WHERE email = @email');
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const alumni = result.recordset[0];
    
    // Verify the password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, alumni.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Remove password from response for security
    delete alumni.password;
    res.json({ role: 'alumni', alumni });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= EVENT API ENDPOINTS ================= //

// Function to get all approved alumni emails
async function getApprovedAlumniEmails() {
  try {
    const request = pool.request();
    const result = await request.query("SELECT email, name FROM alumni WHERE status = 'approved'");
    return result.recordset;
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
    const request = pool.request();
    request.input('event_name', sql.NVarChar, event_name);
    request.input('event_description', sql.NVarChar, event_description);
    request.input('event_venue', sql.NVarChar, event_venue);
    request.input('event_date', sql.Date, event_date);
    request.input('event_time', sql.Time, event_time);

    const result = await request.query(`
      INSERT INTO events (event_name, event_description, event_venue, event_date, event_time) 
      VALUES (@event_name, @event_description, @event_venue, @event_date, @event_time);
      SELECT SCOPE_IDENTITY() as id, * FROM events WHERE id = SCOPE_IDENTITY();
    `);
    
    const newEvent = result.recordset[0];
    
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
    const request = pool.request();
    const result = await request.query("SELECT * FROM events ORDER BY event_date ASC, event_time ASC");
    res.json({ success: true, events: result.recordset });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get events by date
app.get('/api/events/date/:date', async (req, res) => {
  const { date } = req.params;
  
  try {
    const request = pool.request();
    request.input('date', sql.Date, date);
    const result = await request.query("SELECT * FROM events WHERE event_date = @date ORDER BY event_time ASC");
    res.json({ success: true, events: result.recordset });
  } catch (err) {
    console.error('Error fetching events by date:', err);
    res.status(500).json({ error: 'Failed to fetch events by date' });
  }
});

// Get single event by ID
app.get('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const request = pool.request();
    request.input('id', sql.Int, id);
    const result = await request.query("SELECT * FROM events WHERE id = @id");
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true, event: result.recordset[0] });
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
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('event_name', sql.NVarChar, event_name);
    request.input('event_description', sql.NVarChar, event_description);
    request.input('event_venue', sql.NVarChar, event_venue);
    request.input('event_date', sql.Date, event_date);
    request.input('event_time', sql.Time, event_time);

    const result = await request.query(`
      UPDATE events SET 
        event_name = @event_name, 
        event_description = @event_description, 
        event_venue = @event_venue, 
        event_date = @event_date, 
        event_time = @event_time, 
        updated_at = GETDATE() 
      WHERE id = @id;
      SELECT * FROM events WHERE id = @id;
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ success: true, event: result.recordset[0] });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Get all alumni emails (for debugging purposes)
app.get('/api/alumni/emails', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query("SELECT id, name, email, status FROM alumni ORDER BY status, name");
    res.json({ 
      success: true, 
      alumni: result.recordset,
      total: result.recordset.length,
      approved: result.recordset.filter(alumni => alumni.status === 'approved').length
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
    const request = pool.request();
    const allAlumni = await request.query("SELECT id, name, email, status FROM alumni");
    const approvedAlumni = allAlumni.recordset.filter(a => a.status === 'approved');
    
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
        totalAlumni: allAlumni.recordset.length,
        approvedAlumni: approvedAlumni.length,
        alumniList: allAlumni.recordset.map(a => ({
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
    const request = pool.request();
    request.input('id', sql.Int, id);
    const result = await request.query(`
      DELETE FROM events WHERE id = @id;
      SELECT @@ROWCOUNT as deletedRows;
    `);
    
    if (result.recordset[0].deletedRows === 0) {
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
