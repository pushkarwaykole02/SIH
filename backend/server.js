import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
dotenv.config();

const app = express();

// Configure CORS
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    const allowedRegexes = [
      /https:\/\/.*\.vercel\.app$/,
      /https:\/\/.*\.onrender\.com$/,
      /https:\/\/.*\.azurestaticapps\.net$/,
      /https:\/\/.*\.azurewebsites\.net$/,
    ];
    const isAllowed =
      !origin ||
      allowed.includes(origin) ||
      allowedRegexes.some((re) => re.test(origin));
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
  server: process.env.DB_SERVER || process.env.AZURE_SQL_SERVER,
  database: process.env.DB_DATABASE || process.env.AZURE_SQL_DATABASE,
  // Prefer explicit SQL auth variables, fall back to AAD username/password
  sqlUser: process.env.DB_USER || process.env.AZURE_SQL_USERNAME || null,
  sqlPassword: process.env.DB_PASSWORD || process.env.AZURE_SQL_PASSWORD || null,
  aadUser: process.env.AZURE_AD_USERNAME || null,
  aadPassword: process.env.AZURE_AD_PASSWORD || null,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || true,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || false,
    enableArithAbort: true
  }
};

// Debug: Log the configuration values
console.log('Azure SQL Configuration:');
console.log('Server:', azureConfig.server);
console.log('Database:', azureConfig.database);
console.log('User(SQL):', azureConfig.sqlUser || '—');
console.log('User(AAD):', azureConfig.aadUser || '—');
console.log('SQL Password:', azureConfig.sqlPassword ? '***SET***' : '***NOT SET***');
console.log('AAD Password:', azureConfig.aadPassword ? '***SET***' : '***NOT SET***');

if (!azureConfig.server || !azureConfig.database) {
  console.warn("WARNING: Azure SQL configuration not set. The server will start but DB operations will fail until you set AZURE_SQL_SERVER and AZURE_SQL_DATABASE.");
}

if (!azureConfig.sqlUser && !azureConfig.aadUser) {
  console.warn("WARNING: No database credentials found. Set AZURE_SQL_USERNAME/AZURE_SQL_PASSWORD (recommended) or AZURE_AD_USERNAME/AZURE_AD_PASSWORD.");
}

let pool;

// Initialize Azure SQL connection
async function initializeDatabase() {
  if (!azureConfig.server || !azureConfig.database) {
    console.warn("Skipping database initialization - Azure SQL config not set");
    return;
  }

  try {
    // Prefer SQL auth on servers like Render where AAD interactive methods are unavailable
    if (azureConfig.sqlUser && azureConfig.sqlPassword) {
      console.log("🔐 Trying SQL authentication first...");
      const sqlAuthConfig = {
        server: azureConfig.server,
        database: azureConfig.database,
        user: azureConfig.sqlUser,
        password: azureConfig.sqlPassword,
        options: azureConfig.options
      };
      pool = await sql.connect(sqlAuthConfig);
      console.log("✅ Connected to Azure SQL Database (SQL auth)");
      await ensureTables();
      return;
    }

    console.log("🔐 Getting Azure AD access token using DefaultAzureCredential...");
    console.log("This will try: Azure CLI → Environment Variables → Managed Identity");
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://database.windows.net/');
    const accessToken = tokenResponse.token;
    console.log("✅ Azure AD token obtained");
    const connectionConfig = {
      server: azureConfig.server,
      database: azureConfig.database,
      authentication: {
        type: 'azure-active-directory-access-token',
        options: { token: accessToken }
      },
      options: azureConfig.options
    };
    console.log("🔗 Connecting to Azure SQL Database (AAD token)...");
    pool = await sql.connect(connectionConfig);
    console.log("✅ Connected to Azure SQL Database (AAD token)");
    await ensureTables();
  } catch (err) {
    console.error("❌ Failed to connect to Azure SQL Database:", err.message);
    console.error("Make sure you have proper Azure AAD authentication configured");
    console.error("Error details:", err);
    
    // Try AAD username/password if provided
    if (azureConfig.aadUser && azureConfig.aadPassword) {
      try {
        console.log("🔄 Trying AAD username/password auth...");
        const aadPasswordConfig = {
          server: azureConfig.server,
          database: azureConfig.database,
          authentication: {
            type: 'azure-active-directory-password',
            options: {
              userName: azureConfig.aadUser,
              password: azureConfig.aadPassword
            }
          },
          options: azureConfig.options
        };
        pool = await sql.connect(aadPasswordConfig);
        console.log("✅ Connected to Azure SQL Database (AAD username/password)");
        await ensureTables();
        return;
      } catch (errAadPwd) {
        console.error("❌ AAD username/password auth failed:", errAadPwd.message);
      }
    }

    // Final fallback: SQL auth using aadUser if that was actually a SQL login
    console.log("🔄 Trying SQL Server authentication as final fallback...");
    try {
      const fallbackConfig = {
        server: azureConfig.server,
        database: azureConfig.database,
        user: azureConfig.sqlUser || azureConfig.aadUser,
        password: azureConfig.sqlPassword || azureConfig.aadPassword,
        options: azureConfig.options
      };
      pool = await sql.connect(fallbackConfig);
      console.log("✅ Connected to Azure SQL Database (SQL auth fallback)");
      await ensureTables();
    } catch (err2) {
      console.error("❌ Fallback connection also failed:", err2.message);
    }
  }
}

// On startup create all required tables
async function ensureTables() {
  if (!pool) return;
  
  // Users table for role-based authentication
  const createUsers = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
  CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL CHECK (role IN ('admin', 'alumni', 'student', 'recruiter')),
    status NVARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  // Extended alumni table
  const createAlumni = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='alumni' AND xtype='U')
  CREATE TABLE alumni (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(id),
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    phone NVARCHAR(50),
    degree NVARCHAR(255),
    graduation_year INT,
    department NVARCHAR(255),
    batch NVARCHAR(50),
    address NVARCHAR(500),
    city NVARCHAR(100),
    state NVARCHAR(100),
    country NVARCHAR(100),
    linkedin NVARCHAR(500),
    github NVARCHAR(500),
    website NVARCHAR(500),
    company NVARCHAR(255),
    designation NVARCHAR(255),
    years_experience INT,
    document_path NVARCHAR(500),
    document_original_name NVARCHAR(255),
    status NVARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  // Events table
  const createEvents = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='events' AND xtype='U')
  CREATE TABLE events (
    id INT IDENTITY(1,1) PRIMARY KEY,
    event_name NVARCHAR(255) NOT NULL,
    event_description NVARCHAR(MAX) NOT NULL,
    event_venue NVARCHAR(500) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    created_by INT FOREIGN KEY REFERENCES Users(id),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  // Event RSVP table
  const createEventRSVP = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Event_RSVP' AND xtype='U')
  CREATE TABLE Event_RSVP (
    id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT FOREIGN KEY REFERENCES events(id) ON DELETE CASCADE,
    user_id INT FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
    rsvp_status NVARCHAR(50) NOT NULL CHECK (rsvp_status IN ('going', 'interested', 'not_going')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    UNIQUE(event_id, user_id)
  );
  `;

  // Mentorship table
  const createMentorship = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Mentorship' AND xtype='U')
  CREATE TABLE Mentorship (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mentor_id INT FOREIGN KEY REFERENCES Users(id),
    mentee_id INT FOREIGN KEY REFERENCES Users(id),
    subject_area NVARCHAR(255),
    description NVARCHAR(MAX),
    status NVARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  // Mentorship Programs table (new workflow)
  const createMentorshipPrograms = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MentorshipPrograms' AND xtype='U')
  CREATE TABLE MentorshipPrograms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mentor_user_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    subject NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    whatsapp_link NVARCHAR(1000) NOT NULL,
    batch_size INT NOT NULL CHECK (batch_size > 0),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  // Mentorship Enrollments table (new workflow)
  const createMentorshipEnrollments = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MentorshipEnrollments' AND xtype='U')
  CREATE TABLE MentorshipEnrollments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    program_id INT NOT NULL FOREIGN KEY REFERENCES MentorshipPrograms(id),
    mentee_user_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    created_at DATETIME2 DEFAULT GETDATE(),
    UNIQUE(program_id, mentee_user_id)
  );
  `;

  // Donations table
  const createDonations = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Donations' AND xtype='U')
  CREATE TABLE Donations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    donor_id INT FOREIGN KEY REFERENCES Users(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method NVARCHAR(50),
    payment_id NVARCHAR(255),
    status NVARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  // Jobs table for recruiter postings
  const createJobs = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Jobs' AND xtype='U')
  CREATE TABLE Jobs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    recruiter_id INT FOREIGN KEY REFERENCES Users(id),
    title NVARCHAR(255) NOT NULL,
    company NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    location NVARCHAR(255),
    job_type NVARCHAR(50) CHECK (job_type IN ('full-time', 'part-time', 'internship', 'contract')),
    salary_range NVARCHAR(100),
    requirements NVARCHAR(MAX),
    status NVARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  // Notifications table
  const createNotifications = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
  CREATE TABLE Notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    type NVARCHAR(50) CHECK (type IN ('event', 'mentorship', 'donation', 'approval', 'general')),
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  // Career updates table for tracking job changes
  const createCareerUpdates = `
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CareerUpdates' AND xtype='U')
  CREATE TABLE CareerUpdates (
    id INT IDENTITY(1,1) PRIMARY KEY,
    alumni_id INT FOREIGN KEY REFERENCES alumni(id) ON DELETE CASCADE,
    company NVARCHAR(255) NOT NULL,
    designation NVARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BIT DEFAULT 1,
    description NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE()
  );
  `;

  try {
    await pool.request().query(createUsers);
    await pool.request().query(createAlumni);
    await pool.request().query(createEvents);
    await pool.request().query(createEventRSVP);
    await pool.request().query(createMentorship);
    await pool.request().query(createMentorshipPrograms);
    await pool.request().query(createMentorshipEnrollments);
    await pool.request().query(createDonations);
    await pool.request().query(createJobs);
    await pool.request().query(createNotifications);
    await pool.request().query(createCareerUpdates);
    console.log("✅ Ensured all tables exist in Azure SQL Database");
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

// Ensure database connection ONLY for API routes
app.use('/api', (req, res, next) => {
  if (!pool) {
    console.error('Database pool is not initialized yet. Path:', req.path);
    return res.status(503).json({ error: 'Database not connected. Please try again shortly.' });
  }
  next();
});

// Register alumni with file upload
app.post('/api/register', upload.single('document'), async (req, res) => {
  const {
    name, email, password, phone, degree, graduation_year, department, batch,
    address, city, state, country, linkedin, github, website, company, designation, years_experience
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

    // Check if a user already exists (reapply flow)
    let userId = null;
    const existingUserCheck = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, role FROM Users WHERE email = @email');

    if (existingUserCheck.recordset.length > 0) {
      // Email already exists – allow only if current state is reapply (alumni rejected)
      userId = existingUserCheck.recordset[0].id;

      const existingAlumni = await pool.request()
        .input('user_id', sql.Int, userId)
        .query('SELECT TOP 1 * FROM alumni WHERE user_id = @user_id');

      if (existingAlumni.recordset.length === 0) {
        // Inconsistent state; block duplicate email registration
        return res.status(409).json({ error: 'Email already registered' });
      }

      const currentStatus = existingAlumni.recordset[0].status;
      if (currentStatus !== 'rejected') {
        // Only rejected accounts may reapply
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Reapply flow: update password and continue to update alumni to pending
      await pool.request()
        .input('id', sql.Int, userId)
        .input('password', sql.NVarChar, hashedPassword)
        .query('UPDATE Users SET password = @password WHERE id = @id');
    } else {
      // Create user account
      const createUser = await pool.request()
        .input('email', sql.NVarChar, email)
        .input('password', sql.NVarChar, hashedPassword)
        .input('role', sql.NVarChar, 'alumni')
        .input('status', sql.NVarChar, 'active')
        .query(`
          INSERT INTO Users (email, password, role, status) 
          VALUES (@email, @password, @role, @status);
          SELECT SCOPE_IDENTITY() as user_id;
        `);
      userId = createUser.recordset[0].user_id;
    }

    // Then, create alumni profile
    const alumniRequest = pool.request();
    alumniRequest.input('user_id', sql.Int, userId);
    alumniRequest.input('name', sql.NVarChar, name);
    alumniRequest.input('email', sql.NVarChar, email);
    alumniRequest.input('phone', sql.NVarChar, phone);
    alumniRequest.input('degree', sql.NVarChar, degree);
    alumniRequest.input('graduation_year', sql.Int, graduation_year || null);
    alumniRequest.input('department', sql.NVarChar, department);
    alumniRequest.input('batch', sql.NVarChar, batch);
    alumniRequest.input('address', sql.NVarChar, address);
    alumniRequest.input('city', sql.NVarChar, city);
    alumniRequest.input('state', sql.NVarChar, state);
    alumniRequest.input('country', sql.NVarChar, country);
    alumniRequest.input('linkedin', sql.NVarChar, linkedin);
    alumniRequest.input('github', sql.NVarChar, github);
    alumniRequest.input('website', sql.NVarChar, website);
    alumniRequest.input('company', sql.NVarChar, company);
    alumniRequest.input('designation', sql.NVarChar, designation);
    alumniRequest.input('years_experience', sql.Int, years_experience || null);
    alumniRequest.input('document_path', sql.NVarChar, req.file.path);
    alumniRequest.input('document_original_name', sql.NVarChar, req.file.originalname);

    // If alumni already exists, update it; else insert new
    const upsertResult = await alumniRequest.query(`
      IF EXISTS (SELECT 1 FROM alumni WHERE user_id = @user_id)
      BEGIN
        UPDATE alumni SET
          name = @name,
          email = @email,
          phone = @phone,
          degree = @degree,
          graduation_year = @graduation_year,
          department = @department,
          batch = @batch,
          address = @address,
          city = @city,
          state = @state,
          country = @country,
          linkedin = @linkedin,
          github = @github,
          website = @website,
          company = @company,
          designation = @designation,
          years_experience = @years_experience,
          document_path = @document_path,
          document_original_name = @document_original_name,
          status = 'pending',
          updated_at = GETDATE()
        WHERE user_id = @user_id;
        SELECT * FROM alumni WHERE user_id = @user_id;
      END
      ELSE
      BEGIN
        INSERT INTO alumni (
          user_id, name, email, phone, degree, graduation_year, department, batch,
          address, city, state, country, linkedin, github, website, company, designation, years_experience,
          document_path, document_original_name, status
        ) VALUES (
          @user_id, @name, @email, @phone, @degree, @graduation_year, @department, @batch,
          @address, @city, @state, @country, @linkedin, @github, @website, @company, @designation, @years_experience,
          @document_path, @document_original_name, 'pending'
        );
        SELECT SCOPE_IDENTITY() as id, * FROM alumni WHERE id = SCOPE_IDENTITY();
      END
    `);
    
    res.json({ success: true, alumni: upsertResult.recordset[0] });
  } catch (err) {
    console.error(err);
    // If database insert fails, delete the uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

// Register student (simplified registration without document upload)
app.post('/api/student/register', async (req, res) => {
  const {
    name, email, password, phone, department, linkedin
  } = req.body;

  if (!email || !password || !name || !department) {
    return res.status(400).json({ error: 'name, email, password, and department are required' });
  }

  // Validate .edu email (accepts .edu, .edu.in, .edu.au, etc.)
  if (!email.match(/\.edu(\.[a-z]{2,3})?$/i)) {
    return res.status(400).json({ error: 'Student registration requires a .edu email address' });
  }

  // Validate phone number (10 digits only)
  if (phone && !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
  }

  try {
    // Check if email already exists
    const existingUserCheck = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM Users WHERE email = @email');

    if (existingUserCheck.recordset.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user account with role 'student'
    const createUser = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('role', sql.NVarChar, 'student')
      .input('status', sql.NVarChar, 'active')
      .query(`
        INSERT INTO Users (email, password, role, status) 
        VALUES (@email, @password, @role, @status);
        SELECT SCOPE_IDENTITY() as user_id;
      `);
    
    const userId = createUser.recordset[0].user_id;

    // Create student profile with only required fields
    const studentRequest = pool.request();
    studentRequest.input('user_id', sql.Int, userId);
    studentRequest.input('name', sql.NVarChar, name);
    studentRequest.input('email', sql.NVarChar, email);
    studentRequest.input('phone', sql.NVarChar, phone);
    studentRequest.input('department', sql.NVarChar, department);
    studentRequest.input('linkedin', sql.NVarChar, linkedin || '');

    const studentResult = await studentRequest.query(`
      INSERT INTO students (user_id, name, email, phone, department, linkedin)
      VALUES (@user_id, @name, @email, @phone, @department, @linkedin);
      SELECT SCOPE_IDENTITY() as id, * FROM students WHERE id = SCOPE_IDENTITY();
    `);
    
    res.json({ success: true, student: studentResult.recordset[0] });
  } catch (err) {
    console.error('Student registration error:', err);
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
    
    // Also ensure associated user account is active for login
    if (alumni.user_id) {
      const request3 = pool.request();
      request3.input('user_id', sql.Int, alumni.user_id);
      await request3.query("UPDATE Users SET status='active' WHERE id = @user_id");
    }
    
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
    await request2.query("UPDATE alumni SET status='rejected' WHERE id = @id");

    // Deactivate associated user to prevent login
    if (alumni.user_id) {
      const request3 = pool.request();
      request3.input('user_id', sql.Int, alumni.user_id);
      await request3.query("UPDATE Users SET status='inactive' WHERE id = @user_id");
    }

    // Send decline email
    const declineEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fee2e2; color: #dc2626; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📋 Registration Update</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your AlumniConnect registration requires attention</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #0f172a; margin-top: 0;">Dear ${alumni.name},</h2>
          <p style="color: #475569; line-height: 1.6;">We regret to inform you that your AlumniConnect registration could not be approved at this time.</p>
        </div>
      </div>
    `;
    
    await sendEmail(alumni.email, '📋 AlumniConnect Registration Update', declineEmailHtml);
    
    res.json({ success: true, message: 'Alumni declined, user deactivated, and email sent' });
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
    return res.json({ role: 'admin', user: { id: 0, email: 'admin@admin.com', role: 'admin' } });
  }

  try {
    const request = pool.request();
    request.input('email', sql.NVarChar, email);
    const result = await request.query(`
      SELECT 
        u.id,
        u.email,
        u.password,
        u.role,
        u.status AS user_status,
        a.*,
        a.status AS alumni_status,
        s.name AS student_name,
        s.phone AS student_phone,
        s.department AS student_department,
        s.linkedin AS student_linkedin
      FROM Users u
      LEFT JOIN alumni a ON u.id = a.user_id
      LEFT JOIN students s ON u.id = s.user_id
      WHERE u.email = @email
    `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    
    // Verify the password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If alumni exists and registration not approved, short-circuit with clear message
    if (user.role === 'alumni' && user.alumni_status && user.alumni_status !== 'approved') {
      return res.status(401).json({ error: 'Registration not approved' });
    }

    // Check if user is active
    if (user.user_status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Remove password from response for security
    delete user.password;
    
    // Return appropriate data based on role
    if (user.role === 'alumni' && user.id) {
      // Return alumni data
      // Normalize id so frontend can rely on user.user_id
      user.user_id = user.user_id || user.id;
      res.json({ role: 'alumni', user, alumni: user });
    } else if (user.role === 'student') {
      // Return student data with profile information
      console.log('Student login - raw user data:', user); // Debug log
      const studentData = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.student_name,
        phone: user.student_phone,
        department: user.student_department,
        linkedin: user.student_linkedin
      };
      console.log('Student login - processed data:', studentData); // Debug log
      res.json({ role: 'student', user: studentData });
    } else if (user.role === 'recruiter') {
      // Return recruiter data
      res.json({ role: 'recruiter', user });
    } else {
      res.json({ role: user.role, user });
    }
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
  let { event_name, event_description, event_venue, event_date, event_time } = req.body;
  
  try {
    const request = pool.request();
    // Normalize inputs
    const normalizedTime = (typeof event_time === 'string' && event_time.trim() !== '')
      ? (event_time.length === 5 ? `${event_time}:00` : event_time)
      : null;

    request.input('event_name', sql.NVarChar, event_name);
    request.input('event_description', sql.NVarChar, event_description);
    request.input('event_venue', sql.NVarChar, event_venue);
    request.input('event_date', sql.Date, event_date || null);
    request.input('event_time', sql.VarChar, normalizedTime);

    const result = await request.query(`
      INSERT INTO events (event_name, event_description, event_venue, event_date, event_time) 
      VALUES (
        @event_name, 
        @event_description, 
        @event_venue, 
        @event_date, 
        CASE WHEN @event_time IS NULL OR @event_time = '' THEN NULL ELSE CAST(@event_time AS time) END
      );
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

// ================= EVENT RSVP API ENDPOINTS ================= //

// RSVP to an event
app.post('/api/events/:id/rsvp', async (req, res) => {
  const { id } = req.params;
  const { user_id, rsvp_status } = req.body;
  
  if (!user_id || !rsvp_status) {
    return res.status(400).json({ error: 'user_id and rsvp_status are required' });
  }
  
  if (!['going', 'interested', 'not_going'].includes(rsvp_status)) {
    return res.status(400).json({ error: 'Invalid rsvp_status. Must be: going, interested, or not_going' });
  }
  
  try {
    const request = pool.request();
    request.input('event_id', sql.Int, id);
    request.input('user_id', sql.Int, user_id);
    request.input('rsvp_status', sql.NVarChar, rsvp_status);
    
    const result = await request.query(`
      MERGE Event_RSVP AS target
      USING (SELECT @event_id as event_id, @user_id as user_id, @rsvp_status as rsvp_status) AS source
      ON target.event_id = source.event_id AND target.user_id = source.user_id
      WHEN MATCHED THEN
        UPDATE SET rsvp_status = source.rsvp_status, updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (event_id, user_id, rsvp_status) VALUES (source.event_id, source.user_id, source.rsvp_status);
      
      SELECT * FROM Event_RSVP WHERE event_id = @event_id AND user_id = @user_id;
    `);
    
    res.json({ success: true, rsvp: result.recordset[0] });
  } catch (err) {
    console.error('Error updating RSVP:', err);
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
});

// Get RSVP counts for an event
app.get('/api/events/:id/rsvp-counts', async (req, res) => {
  const { id } = req.params;
  
  try {
    const request = pool.request();
    request.input('event_id', sql.Int, id);
    
    const result = await request.query(`
      SELECT 
        rsvp_status,
        COUNT(*) as count
      FROM Event_RSVP 
      WHERE event_id = @event_id 
      GROUP BY rsvp_status
    `);
    
    const counts = {
      going: 0,
      interested: 0,
      not_going: 0
    };
    
    result.recordset.forEach(row => {
      counts[row.rsvp_status] = row.count;
    });
    
    res.json({ success: true, counts });
  } catch (err) {
    console.error('Error getting RSVP counts:', err);
    res.status(500).json({ error: 'Failed to get RSVP counts' });
  }
});

// ================= MENTORSHIP API ENDPOINTS ================= //

// Register as mentor
app.post('/api/mentorship/register', async (req, res) => {
  const { user_id, subject_areas, description, mentor_links } = req.body;
  
  if (!user_id || !subject_areas) {
    return res.status(400).json({ error: 'user_id and subject_areas are required' });
  }
  
  try {
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    request.input('subject_areas', sql.NVarChar, JSON.stringify(subject_areas));
    request.input('description', sql.NVarChar, description || null);
    request.input('mentor_links', sql.NVarChar, mentor_links ? JSON.stringify(mentor_links) : null);
    
    // Ensure an explicit mentor flag exists, then set it
    await request.query(`
      IF COL_LENGTH('alumni','is_mentor') IS NULL 
      BEGIN
        ALTER TABLE alumni ADD is_mentor BIT NOT NULL CONSTRAINT DF_alumni_is_mentor DEFAULT 0;
      END
    `);
    await request.query(`
      IF COL_LENGTH('alumni','mentor_subjects') IS NULL 
      BEGIN
        ALTER TABLE alumni ADD mentor_subjects NVARCHAR(MAX) NULL;
      END;
      IF COL_LENGTH('alumni','mentor_bio') IS NULL 
      BEGIN
        ALTER TABLE alumni ADD mentor_bio NVARCHAR(MAX) NULL;
      END;
      IF COL_LENGTH('alumni','mentor_links') IS NULL 
      BEGIN
        ALTER TABLE alumni ADD mentor_links NVARCHAR(MAX) NULL;
      END;
      UPDATE alumni 
      SET is_mentor = 1,
          mentor_subjects = @subject_areas,
          mentor_bio = @description,
          mentor_links = CASE WHEN @mentor_links IS NULL THEN mentor_links ELSE @mentor_links END
      WHERE user_id = @user_id;
    `);
    
    res.json({ success: true, message: 'Successfully registered as mentor' });
  } catch (err) {
    console.error('Error registering as mentor:', err);
    res.status(500).json({ error: 'Failed to register as mentor' });
  }
});

// Request mentorship
app.post('/api/mentorship/request', async (req, res) => {
  const { mentor_id, mentee_id, subject_area, description } = req.body;
  
  if (!mentor_id || !mentee_id || !subject_area) {
    return res.status(400).json({ error: 'mentor_id, mentee_id, and subject_area are required' });
  }
  
  try {
    const request = pool.request();
    request.input('mentor_id', sql.Int, mentor_id);
    request.input('mentee_id', sql.Int, mentee_id);
    request.input('subject_area', sql.NVarChar, subject_area);
    request.input('description', sql.NVarChar, description);
    
    const result = await request.query(`
      INSERT INTO Mentorship (mentor_id, mentee_id, subject_area, description, status)
      VALUES (@mentor_id, @mentee_id, @subject_area, @description, 'pending');
      SELECT SCOPE_IDENTITY() as id, * FROM Mentorship WHERE id = SCOPE_IDENTITY();
    `);
    
    res.json({ success: true, mentorship: result.recordset[0] });
  } catch (err) {
    console.error('Error creating mentorship request:', err);
    res.status(500).json({ error: 'Failed to create mentorship request' });
  }
});

// Get mentorship requests for a user
app.get('/api/mentorship/:user_id', async (req, res) => {
  const { type } = req.query; // 'mentor' or 'mentee'
  let { user_id } = req.params;
  const parsedId = parseInt(user_id, 10);
  if (Number.isNaN(parsedId)) {
    return res.json({ success: true, mentorships: [] });
  }
  
  try {
    const request = pool.request();
    request.input('user_id', sql.Int, parsedId);
    
    let query = '';
    if (type === 'mentor') {
      query = `
        SELECT m.*, s.name as mentee_name, s.email as mentee_email,
               mentor.mentor_links as mentor_links
        FROM Mentorship m
        JOIN students s ON m.mentee_id = s.user_id
        LEFT JOIN alumni mentor ON m.mentor_id = mentor.user_id
        WHERE m.mentor_id = @user_id
        ORDER BY m.created_at DESC
      `;
    } else {
      query = `
        SELECT m.*, a.name as mentor_name, a.email as mentor_email,
               a.mentor_links as mentor_links
        FROM Mentorship m
        JOIN alumni a ON m.mentor_id = a.user_id
        WHERE m.mentee_id = @user_id
        ORDER BY m.created_at DESC
      `;
    }
    
    const result = await request.query(query);
    // Parse mentor_links JSON if present and attach subject-specific links
    const rows = result.recordset.map(r => {
      let links = null;
      try {
        if (r.mentor_links) {
          const all = typeof r.mentor_links === 'string' ? JSON.parse(r.mentor_links) : r.mentor_links;
          if (all && r.subject_area) {
            const subject = String(r.subject_area).trim().toLowerCase();
            // 1) Exact key match (case-insensitive)
            const exactKey = Object.keys(all).find(k => String(k).trim().toLowerCase() === subject);
            if (exactKey) {
              links = all[exactKey];
            } else {
              // 2) Substring match either direction
              const fuzzyKey = Object.keys(all).find(k => {
                const kk = String(k).trim().toLowerCase();
                return kk.includes(subject) || subject.includes(kk);
              });
              if (fuzzyKey) {
                links = all[fuzzyKey];
              }
              // 3) Fallback to the first provided set of links
              if (!links) {
                const firstKey = Object.keys(all)[0];
                if (firstKey) links = all[firstKey];
              }
            }
          }
        }
      } catch {}
      return { ...r, community_links: links };
    });
    res.json({ success: true, mentorships: rows });
  } catch (err) {
    console.error('Error getting mentorship requests:', err);
    res.status(500).json({ error: 'Failed to get mentorship requests' });
  }
});

// Update mentorship status
app.put('/api/mentorship/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('status', sql.NVarChar, status);
    
    const result = await request.query(`
      UPDATE Mentorship 
      SET status = @status, updated_at = GETDATE()
      WHERE id = @id;
      SELECT * FROM Mentorship WHERE id = @id;
    `);
    
    res.json({ success: true, mentorship: result.recordset[0] });
  } catch (err) {
    console.error('Error updating mentorship status:', err);
    res.status(500).json({ error: 'Failed to update mentorship status' });
  }
});

// List mentors directory (basic): alumni marked as mentors
app.get('/api/mentors', async (req, res) => {
  const { search } = req.query; // optional search by name/email/department
  try {
    const request = pool.request();
    // Prefer explicit mentor flag; fallback to designation text only if column missing
    let where = "WHERE (CASE WHEN COL_LENGTH('alumni','is_mentor') IS NOT NULL THEN a.is_mentor ELSE CASE WHEN a.designation LIKE '%Mentor%' THEN 1 ELSE 0 END END) = 1";
    if (search && search.trim()) {
      request.input('search', sql.NVarChar, `%${search.trim()}%`);
      where += " AND (a.name LIKE @search OR a.email LIKE @search OR a.department LIKE @search OR (CASE WHEN COL_LENGTH('alumni','mentor_subjects') IS NOT NULL THEN a.mentor_subjects ELSE '' END) LIKE @search)";
    }
    const result = await request.query(`
      SELECT TOP 50 a.user_id, a.name, a.email, a.department, a.designation, 
             CASE WHEN COL_LENGTH('alumni','is_mentor') IS NOT NULL THEN a.is_mentor ELSE NULL END as is_mentor,
             CASE WHEN COL_LENGTH('alumni','mentor_subjects') IS NOT NULL THEN a.mentor_subjects ELSE NULL END as mentor_subjects
      FROM alumni a
      ${where}
      ORDER BY a.name ASC
    `);
    res.json({ success: true, mentors: result.recordset });
  } catch (err) {
    console.error('Error listing mentors:', err);
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// ================= MENTORSHIP PROGRAMS (NEW WORKFLOW) ================= //

// Mentor creates a mentorship program (whatsapp only, batch size)
app.post('/api/mentorship/programs', async (req, res) => {
  let { mentor_user_id, subject, description, whatsapp_link, batch_size } = req.body;
  if (!mentor_user_id || !subject || !whatsapp_link || !batch_size) {
    return res.status(400).json({ error: 'mentor_user_id, subject, whatsapp_link, batch_size are required' });
  }
  try {
    // Normalize mentor_user_id: if it's an alumni.id, map to Users.id
    let normalizedMentorId = parseInt(mentor_user_id, 10);
    if (Number.isNaN(normalizedMentorId)) {
      return res.status(400).json({ error: 'Invalid mentor_user_id' });
    }
    // Check Users table first
    const userExists = await pool.request()
      .input('uid', sql.Int, normalizedMentorId)
      .query('SELECT TOP 1 id FROM Users WHERE id = @uid');
    if (userExists.recordset.length === 0) {
      // Try map from alumni.id -> alumni.user_id
      const mapRes = await pool.request()
        .input('aid', sql.Int, normalizedMentorId)
        .query('SELECT TOP 1 user_id FROM alumni WHERE id = @aid');
      if (mapRes.recordset.length > 0 && mapRes.recordset[0].user_id) {
        normalizedMentorId = mapRes.recordset[0].user_id;
      }
    }

    const request = pool.request();
    request.input('mentor_user_id', sql.Int, normalizedMentorId);
    request.input('subject', sql.NVarChar, subject);
    request.input('description', sql.NVarChar, description || null);
    request.input('whatsapp_link', sql.NVarChar, whatsapp_link);
    request.input('batch_size', sql.Int, batch_size);

    const result = await request.query(`
      INSERT INTO MentorshipPrograms (mentor_user_id, subject, description, whatsapp_link, batch_size)
      VALUES (@mentor_user_id, @subject, @description, @whatsapp_link, @batch_size);
      SELECT SCOPE_IDENTITY() AS id;
    `);
    const id = result.recordset[0].id;
    console.log('Created MentorshipProgram id=', id, 'mentor_user_id=', normalizedMentorId, 'subject=', subject);
    const details = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT p.*, a.name AS mentor_name, a.email AS mentor_email
        FROM MentorshipPrograms p
        LEFT JOIN alumni a ON a.user_id = p.mentor_user_id
        WHERE p.id = @id
      `);
    const program = details.recordset[0];
    console.log('Program details:', program);
    res.json({ success: true, program });
  } catch (err) {
    console.error('Error creating mentorship program:', err);
    res.status(500).json({ error: 'Failed to create mentorship program' });
  }
});

// List active mentorship programs with current joined counts
app.get('/api/mentorship/programs', async (req, res) => {
  try {
    const { mentee_user_id } = req.query;
    const request = pool.request();
    if (mentee_user_id) {
      const parsed = parseInt(String(mentee_user_id), 10);
      if (!Number.isNaN(parsed)) {
        request.input('mentee_user_id', sql.Int, parsed);
      }
    }
    const result = await request.query(`
      SELECT p.id, p.mentor_user_id, p.subject, p.description, p.whatsapp_link, p.batch_size, p.is_active,
             a.name AS mentor_name,
             ISNULL(e.joined_count, 0) AS joined_count,
             CASE WHEN @mentee_user_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM MentorshipEnrollments me WITH (NOLOCK)
               WHERE me.program_id = p.id AND me.mentee_user_id = @mentee_user_id
             ) THEN 1 ELSE 0 END AS joined_by_me
      FROM MentorshipPrograms p
      LEFT JOIN alumni a ON a.user_id = p.mentor_user_id
      OUTER APPLY (
        SELECT COUNT(*) AS joined_count FROM MentorshipEnrollments e WITH (NOLOCK)
        WHERE e.program_id = p.id
      ) e
      ORDER BY p.created_at DESC
    `);
    console.log('List MentorshipPrograms count =', result.recordset.length);
    res.json({ success: true, programs: result.recordset });
  } catch (err) {
    console.error('Error listing mentorship programs:', err);
    res.status(500).json({ error: 'Failed to list mentorship programs' });
  }
});

// Student joins a mentorship program (no approval, enforce capacity)
app.post('/api/mentorship/programs/:program_id/join', async (req, res) => {
  const { program_id } = req.params;
  const { mentee_user_id } = req.body;
  if (!mentee_user_id) {
    return res.status(400).json({ error: 'mentee_user_id is required' });
  }
  try {
    const request = pool.request();
    request.input('program_id', sql.Int, program_id);
    request.input('mentee_user_id', sql.Int, mentee_user_id);

    // Get program and current count
    const programRes = await request.query(`
      SELECT p.*, ISNULL(cnt.cnt, 0) AS joined_count
      FROM MentorshipPrograms p
      OUTER APPLY (
        SELECT COUNT(*) AS cnt FROM MentorshipEnrollments e WITH (UPDLOCK, HOLDLOCK)
        WHERE e.program_id = p.id
      ) cnt
      WHERE p.id = @program_id AND p.is_active = 1
    `);
    if (programRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Program not found or inactive' });
    }
    const program = programRes.recordset[0];
    if (program.joined_count >= program.batch_size) {
      // Notify mentee about full program
      try {
        await pool.request()
          .input('user_id', sql.Int, mentee_user_id)
          .input('title', sql.NVarChar, 'Mentorship program is full')
          .input('message', sql.NVarChar, `The program '${program.subject}' is already full.`)
          .input('type', sql.NVarChar, 'mentorship')
          .query(`INSERT INTO Notifications (user_id, title, message, type) VALUES (@user_id, @title, @message, @type);`);
      } catch {}
      return res.status(409).json({ error: 'Program is full' });
    }

    // Enroll (unique constraint prevents duplicates)
    const enrollRes = await pool.request()
      .input('program_id', sql.Int, program_id)
      .input('mentee_user_id', sql.Int, mentee_user_id)
      .query(`
        INSERT INTO MentorshipEnrollments (program_id, mentee_user_id)
        VALUES (@program_id, @mentee_user_id);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    // Create notification for mentee
    try {
      await pool.request()
        .input('user_id', sql.Int, mentee_user_id)
        .input('title', sql.NVarChar, 'Joined mentorship program')
        .input('message', sql.NVarChar, `You joined '${program.subject}'.`)
        .input('type', sql.NVarChar, 'mentorship')
        .query(`INSERT INTO Notifications (user_id, title, message, type) VALUES (@user_id, @title, @message, @type);`);
    } catch {}

    res.json({ success: true, enrollment_id: enrollRes.recordset[0].id });
  } catch (err) {
    if (String(err.message).includes('UNIQUE KEY')) {
      // Already joined → notify
      try {
        const p = await pool.request().input('pid', sql.Int, program_id).query('SELECT subject FROM MentorshipPrograms WHERE id=@pid');
        const subj = p.recordset?.[0]?.subject || 'mentorship program';
        await pool.request()
          .input('user_id', sql.Int, mentee_user_id)
          .input('title', sql.NVarChar, 'Already joined')
          .input('message', sql.NVarChar, `You have already joined '${subj}'.`)
          .input('type', sql.NVarChar, 'mentorship')
          .query(`INSERT INTO Notifications (user_id, title, message, type) VALUES (@user_id, @title, @message, @type);`);
      } catch {}
      return res.status(409).json({ error: 'Already joined this program' });
    }
    console.error('Error joining program:', err);
    res.status(500).json({ error: 'Failed to join program' });
  }
});

// Admin: list programs with joined/total
app.get('/api/admin/mentorship-programs', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT p.id, p.subject, p.batch_size, p.is_active, p.created_at,
             a.name AS mentor_name, a.email AS mentor_email,
             ISNULL(e.joined_count, 0) AS joined_count
      FROM MentorshipPrograms p
      LEFT JOIN alumni a ON a.user_id = p.mentor_user_id
      OUTER APPLY (
        SELECT COUNT(*) AS joined_count FROM MentorshipEnrollments e WITH (NOLOCK)
        WHERE e.program_id = p.id
      ) e
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, programs: result.recordset });
  } catch (err) {
    console.error('Error listing admin mentorship programs:', err);
    res.status(500).json({ error: 'Failed to list mentorship programs' });
  }
});

// ================= DONATIONS API ENDPOINTS ================= //

// Create donation
app.post('/api/donations', async (req, res) => {
  const { donor_id, amount, payment_method, payment_id } = req.body;
  
  if (!donor_id || !amount) {
    return res.status(400).json({ error: 'donor_id and amount are required' });
  }
  
  try {
    const request = pool.request();
    request.input('donor_id', sql.Int, donor_id);
    request.input('amount', sql.Decimal(10,2), amount);
    request.input('payment_method', sql.NVarChar, payment_method);
    request.input('payment_id', sql.NVarChar, payment_id);
    request.input('status', sql.NVarChar, 'pending');
    
    const result = await request.query(`
      INSERT INTO Donations (donor_id, amount, payment_method, payment_id, status)
      VALUES (@donor_id, @amount, @payment_method, @payment_id, @status);
      SELECT SCOPE_IDENTITY() as id, * FROM Donations WHERE id = SCOPE_IDENTITY();
    `);
    
    res.json({ success: true, donation: result.recordset[0] });
  } catch (err) {
    console.error('Error creating donation:', err);
    res.status(500).json({ error: 'Failed to create donation' });
  }
});

// Get donations
app.get('/api/donations', async (req, res) => {
  const { donor_id, status } = req.query;
  
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const request = pool.request();
    let query = `
      SELECT d.*, a.name as donor_name, a.email as donor_email
      FROM Donations d
      JOIN alumni a ON d.donor_id = a.user_id
    `;
    
    const conditions = [];
    if (donor_id) {
      request.input('donor_id', sql.Int, donor_id);
      conditions.push('d.donor_id = @donor_id');
    }
    if (status) {
      request.input('status', sql.NVarChar, status);
      conditions.push('d.status = @status');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const result = await request.query(query);
    res.json({ success: true, donations: result.recordset });
  } catch (err) {
    console.error('Error getting donations:', err);
    res.status(500).json({ error: 'Failed to get donations' });
  }
});

// ================= JOBS API ENDPOINTS ================= //

// Create job posting
app.post('/api/jobs', async (req, res) => {
  const { recruiter_id, title, company, description, location, job_type, salary_range, requirements } = req.body;
  
  if (!recruiter_id || !title || !company || !description) {
    return res.status(400).json({ error: 'recruiter_id, title, company, and description are required' });
  }
  
  try {
    const request = pool.request();
    request.input('recruiter_id', sql.Int, recruiter_id);
    request.input('title', sql.NVarChar, title);
    request.input('company', sql.NVarChar, company);
    request.input('description', sql.NVarChar, description);
    request.input('location', sql.NVarChar, location);
    request.input('job_type', sql.NVarChar, job_type);
    request.input('salary_range', sql.NVarChar, salary_range);
    request.input('requirements', sql.NVarChar, requirements);
    request.input('status', sql.NVarChar, 'active');
    
    const result = await request.query(`
      INSERT INTO Jobs (recruiter_id, title, company, description, location, job_type, salary_range, requirements, status)
      VALUES (@recruiter_id, @title, @company, @description, @location, @job_type, @salary_range, @requirements, @status);
      SELECT SCOPE_IDENTITY() as id, * FROM Jobs WHERE id = SCOPE_IDENTITY();
    `);
    
    res.json({ success: true, job: result.recordset[0] });
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Get jobs
app.get('/api/jobs', async (req, res) => {
  const { recruiter_id, status, job_type } = req.query;
  
  try {
    const request = pool.request();
    let query = `
      SELECT j.*, u.email as recruiter_email
      FROM Jobs j
      JOIN Users u ON j.recruiter_id = u.id
    `;
    
    const conditions = [];
    if (recruiter_id) {
      request.input('recruiter_id', sql.Int, recruiter_id);
      conditions.push('j.recruiter_id = @recruiter_id');
    }
    if (status) {
      request.input('status', sql.NVarChar, status);
      conditions.push('j.status = @status');
    }
    if (job_type) {
      request.input('job_type', sql.NVarChar, job_type);
      conditions.push('j.job_type = @job_type');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY j.created_at DESC';
    
    const result = await request.query(query);
    res.json({ success: true, jobs: result.recordset });
  } catch (err) {
    console.error('Error getting jobs:', err);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// ================= NOTIFICATIONS API ENDPOINTS ================= //

// Get notifications for user
app.get('/api/notifications/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { unread_only } = req.query;
  
  try {
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    
    let query = 'SELECT * FROM Notifications WHERE user_id = @user_id';
    
    if (unread_only === 'true') {
      query += ' AND is_read = 0';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await request.query(query);
    res.json({ success: true, notifications: result.recordset });
  } catch (err) {
    console.error('Error getting notifications:', err);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  
  try {
    const request = pool.request();
    request.input('id', sql.Int, id);
    
    const result = await request.query(`
      UPDATE Notifications 
      SET is_read = 1 
      WHERE id = @id;
      SELECT * FROM Notifications WHERE id = @id;
    `);
    
    res.json({ success: true, notification: result.recordset[0] });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ================= ADMIN API ENDPOINTS ================= //

// Get all alumni (for admin)
app.get('/api/admin/all-alumni', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const request = pool.request();
    const result = await request.query(`
      SELECT a.*, 'active' as user_status, 'alumni' as role
      FROM alumni a
      ORDER BY a.id DESC
    `);
    
    res.json({ success: true, alumni: result.recordset });
  } catch (err) {
    console.error('Error getting all alumni:', err);
    res.status(500).json({ error: 'Failed to get all alumni', details: err.message });
  }
});

// Get all mentorships (for admin)
app.get('/api/admin/mentorships', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const request = pool.request();
    const result = await request.query(`
      SELECT m.*, 
             mentor.name as mentor_name, 
             COALESCE(s.name, mentee.name) as mentee_name
      FROM Mentorship m
      LEFT JOIN alumni mentor ON m.mentor_id = mentor.user_id
      LEFT JOIN alumni mentee ON m.mentee_id = mentee.user_id
      LEFT JOIN students s ON m.mentee_id = s.user_id
      ORDER BY m.created_at DESC
    `);
    
    res.json({ success: true, mentorships: result.recordset });
  } catch (err) {
    console.error('Error getting all mentorships:', err);
    res.status(500).json({ error: 'Failed to get all mentorships', details: err.message });
  }
});

// ================= RECOMMENDATION API ENDPOINTS ================= //

// Get mentor recommendations for user
app.get('/api/recommendations/mentors/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    
    // Get user's profile to match against mentors
    const userResult = await request.query(`
      SELECT a.*, u.role FROM alumni a
      LEFT JOIN Users u ON a.user_id = u.id
      WHERE a.user_id = @user_id
    `);
    
    if (userResult.recordset.length === 0) {
      return res.json({ success: true, mentors: [] });
    }
    
    const user = userResult.recordset[0];
    
    // Find mentors with similar backgrounds
    const mentorResult = await request.query(`
      SELECT a.*, u.role,
        CASE 
          WHEN a.department = @department THEN 30
          WHEN a.degree = @degree THEN 20
          WHEN a.company LIKE '%' + @company + '%' THEN 15
          ELSE 0
        END as similarity_score,
        CASE 
          WHEN a.designation LIKE '%Mentor%' THEN 25
          WHEN a.years_experience > 5 THEN 20
          ELSE 10
        END as popularity_score
      FROM alumni a
      LEFT JOIN Users u ON a.user_id = u.id
      WHERE a.user_id != @user_id 
        AND a.designation LIKE '%Mentor%'
        AND u.status = 'active'
      ORDER BY (similarity_score + popularity_score) DESC
    `);
    
    const mentors = mentorResult.recordset.map(mentor => ({
      ...mentor,
      match_reasons: [
        mentor.department === user.department ? 'Same department' : null,
        mentor.degree === user.degree ? 'Same degree program' : null,
        mentor.company && user.company && mentor.company.includes(user.company) ? 'Similar company background' : null,
        mentor.years_experience > 5 ? 'Experienced professional' : null
      ].filter(Boolean)
    }));
    
    res.json({ success: true, mentors: mentors.slice(0, 5) });
  } catch (err) {
    console.error('Error getting mentor recommendations:', err);
    res.status(500).json({ error: 'Failed to get mentor recommendations' });
  }
});

// Get event recommendations for user
app.get('/api/recommendations/events/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    
    // Get user's profile
    const userResult = await request.query(`
      SELECT a.* FROM alumni a WHERE a.user_id = @user_id
    `);
    
    if (userResult.recordset.length === 0) {
      return res.json({ success: true, events: [] });
    }
    
    const user = userResult.recordset[0];
    
    // Get upcoming events with relevance scoring
    const eventResult = await request.query(`
      SELECT e.*,
        CASE 
          WHEN e.title LIKE '%' + @department + '%' THEN 30
          WHEN e.title LIKE '%' + @degree + '%' THEN 25
          WHEN e.title LIKE '%' + @company + '%' THEN 20
          WHEN e.description LIKE '%' + @department + '%' THEN 15
          ELSE 5
        END as relevance_score
      FROM events e
      WHERE e.date >= GETDATE()
      ORDER BY relevance_score DESC, e.date ASC
    `);
    
    const events = eventResult.recordset.map(event => ({
      ...event,
      match_reasons: [
        event.title.includes(user.department) ? 'Related to your department' : null,
        event.title.includes(user.degree) ? 'Related to your degree' : null,
        event.title.includes(user.company) ? 'Related to your company' : null,
        'Upcoming event in your area'
      ].filter(Boolean)
    }));
    
    res.json({ success: true, events: events.slice(0, 5) });
  } catch (err) {
    console.error('Error getting event recommendations:', err);
    res.status(500).json({ error: 'Failed to get event recommendations' });
  }
});

// Get job recommendations for user
app.get('/api/recommendations/jobs/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    
    // Get user's profile
    const userResult = await request.query(`
      SELECT a.* FROM alumni a WHERE a.user_id = @user_id
    `);
    
    if (userResult.recordset.length === 0) {
      return res.json({ success: true, jobs: [] });
    }
    
    const user = userResult.recordset[0];
    
    // Get active jobs with relevance scoring
    const jobResult = await request.query(`
      SELECT j.*,
        CASE 
          WHEN j.title LIKE '%' + @designation + '%' THEN 40
          WHEN j.company = @company THEN 35
          WHEN j.description LIKE '%' + @department + '%' THEN 25
          WHEN j.requirements LIKE '%' + @degree + '%' THEN 20
          ELSE 10
        END as relevance_score
      FROM Jobs j
      WHERE j.status = 'active'
      ORDER BY relevance_score DESC, j.created_at DESC
    `);
    
    const jobs = jobResult.recordset.map(job => ({
      ...job,
      match_reasons: [
        job.title.includes(user.designation) ? 'Matches your current role' : null,
        job.company === user.company ? 'Same company' : null,
        job.description.includes(user.department) ? 'Related to your department' : null,
        job.requirements.includes(user.degree) ? 'Requires your degree' : null
      ].filter(Boolean)
    }));
    
    res.json({ success: true, jobs: jobs.slice(0, 5) });
  } catch (err) {
    console.error('Error getting job recommendations:', err);
    res.status(500).json({ error: 'Failed to get job recommendations' });
  }
});

// Get alumni recommendations for networking
app.get('/api/recommendations/alumni/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    
    // Get user's profile
    const userResult = await request.query(`
      SELECT a.* FROM alumni a WHERE a.user_id = @user_id
    `);
    
    if (userResult.recordset.length === 0) {
      return res.json({ success: true, alumni: [] });
    }
    
    const user = userResult.recordset[0];
    
    // Find alumni with similar backgrounds
    const alumniResult = await request.query(`
      SELECT a.*, u.status,
        CASE 
          WHEN a.department = @department THEN 35
          WHEN a.degree = @degree THEN 30
          WHEN a.company = @company THEN 25
          WHEN a.graduation_year = @graduation_year THEN 20
          WHEN a.batch = @batch THEN 15
          ELSE 5
        END as similarity_score
      FROM alumni a
      LEFT JOIN Users u ON a.user_id = u.id
      WHERE a.user_id != @user_id 
        AND u.status = 'active'
      ORDER BY similarity_score DESC
    `);
    
    const alumni = alumniResult.recordset.map(alumnus => ({
      ...alumnus,
      match_reasons: [
        alumnus.department === user.department ? 'Same department' : null,
        alumnus.degree === user.degree ? 'Same degree program' : null,
        alumnus.company === user.company ? 'Same company' : null,
        alumnus.graduation_year === user.graduation_year ? 'Same graduation year' : null,
        alumnus.batch === user.batch ? 'Same batch' : null
      ].filter(Boolean)
    }));
    
    res.json({ success: true, alumni: alumni.slice(0, 5) });
  } catch (err) {
    console.error('Error getting alumni recommendations:', err);
    res.status(500).json({ error: 'Failed to get alumni recommendations' });
  }
});

// ================= HEALTH CHECK ENDPOINTS ================= //

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Database not connected',
        database: 'disconnected'
      });
    }

    // Test database connection
    const request = pool.request();
    const result = await request.query('SELECT 1 as test');
    
    res.json({ 
      status: 'ok', 
      message: 'Server and database are running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(503).json({ 
      status: 'error', 
      message: 'Database connection failed',
      database: 'error',
      error: err.message
    });
  }
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Database pool not initialized'
      });
    }

    // Check if tables exist
    const request = pool.request();
    const tablesResult = await request.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    
    const tables = tablesResult.recordset.map(row => row.TABLE_NAME);
    
    res.json({ 
      status: 'ok', 
      tables: tables,
      tableCount: tables.length,
      expectedTables: ['Users', 'alumni', 'events', 'Event_RSVP', 'Mentorship', 'Donations', 'Jobs', 'Notifications', 'CareerUpdates']
    });
  } catch (err) {
    console.error('Database status error:', err);
    res.status(503).json({ 
      status: 'error', 
      message: 'Database query failed',
      error: err.message
    });
  }
});

// ================= ANALYTICS API ENDPOINTS ================= //

// Get dashboard analytics
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const request = pool.request();
    
    // Get various counts
    const alumniCount = await request.query("SELECT COUNT(*) as count FROM alumni WHERE status = 'approved'");
    const pendingCount = await request.query("SELECT COUNT(*) as count FROM alumni WHERE status = 'pending'");
    const eventsCount = await request.query("SELECT COUNT(*) as count FROM events");
    const donationsCount = await request.query("SELECT COUNT(*) as count FROM Donations WHERE status = 'completed'");
    const totalDonations = await request.query("SELECT SUM(amount) as total FROM Donations WHERE status = 'completed'");
    const mentorshipCount = await request.query("SELECT COUNT(*) as count FROM Mentorship WHERE status = 'approved'");
    const jobsCount = await request.query("SELECT COUNT(*) as count FROM Jobs WHERE status = 'active'");
    
    res.json({
      success: true,
      analytics: {
        alumni: {
          total: alumniCount.recordset[0].count,
          pending: pendingCount.recordset[0].count
        },
        events: {
          total: eventsCount.recordset[0].count
        },
        donations: {
          count: donationsCount.recordset[0].count,
          total: totalDonations.recordset[0].total || 0
        },
        mentorship: {
          active: mentorshipCount.recordset[0].count
        },
        jobs: {
          active: jobsCount.recordset[0].count
        }
      }
    });
  } catch (err) {
    console.error('Error getting analytics:', err);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ============================================== //

// ===== Static frontend hosting (serves built React app if present) ===== //
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticFrontendDir = path.join(__dirname, 'public');

if (fs.existsSync(staticFrontendDir)) {
  app.use(express.static(staticFrontendDir));
  // Serve favicon quickly to avoid 503 noise during warmup
  app.get('/favicon.ico', (req, res, next) => {
    const fav = path.join(staticFrontendDir, 'favicon.ico');
    if (fs.existsSync(fav)) return res.sendFile(fav);
    res.status(204).end();
  });
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    const indexFile = path.join(staticFrontendDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      return res.sendFile(indexFile);
    }
    return next();
  });
}

// Root route for basic status/health check (fallback if no frontend build)
app.get('/', (req, res) => {
  if (fs.existsSync(staticFrontendDir)) return res.redirect('/');
  res.send('Alumni Backend API is running. Try GET /api/quick-debug');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port', PORT));
