import dotenv from 'dotenv';
import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';

dotenv.config();

// Database configuration - same as server.js
const azureConfig = {
  server: process.env.DB_SERVER || process.env.AZURE_SQL_SERVER,
  database: process.env.DB_DATABASE || process.env.AZURE_SQL_DATABASE,
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

console.log('Database Configuration:');
console.log('Server:', azureConfig.server);
console.log('Database:', azureConfig.database);
console.log('AAD User:', azureConfig.aadUser);
console.log('Encrypt:', azureConfig.options.encrypt);
console.log('Trust Certificate:', azureConfig.options.trustServerCertificate);

async function setupDatabase() {
  let pool;
  try {
    console.log('Connecting to database...');
    
    // Try Azure AD token authentication (same as main server)
    console.log('🔐 Getting Azure AD access token using DefaultAzureCredential...');
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://database.windows.net/');
    const accessToken = tokenResponse.token;
    console.log('✅ Azure AD token obtained');
    
    const connectionConfig = {
      server: azureConfig.server,
      database: azureConfig.database,
      authentication: {
        type: 'azure-active-directory-access-token',
        options: { token: accessToken }
      },
      options: azureConfig.options
    };
    
    console.log('🔗 Connecting to Azure SQL Database (AAD token)...');
    pool = await sql.connect(connectionConfig);
    console.log('✅ Connected to Azure SQL Database (AAD token)');
    console.log('✅ Connected to database successfully!');

    // Create tables
    console.log('Creating tables...');
    
    // Users table
    await pool.request().query(`
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
    `);
    console.log('✅ Users table created');

    // Alumni table - create or update
    await pool.request().query(`
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
    `);
    console.log('✅ Alumni table created/verified');

    // Add missing columns to existing alumni table
    const columnsToAdd = [
      { name: 'user_id', definition: 'INT FOREIGN KEY REFERENCES Users(id)' },
      { name: 'batch', definition: 'NVARCHAR(50)' },
      { name: 'website', definition: 'NVARCHAR(500)' },
      { name: 'company', definition: 'NVARCHAR(255)' },
      { name: 'designation', definition: 'NVARCHAR(255)' },
      { name: 'years_experience', definition: 'INT' },
      { name: 'document_path', definition: 'NVARCHAR(500)' },
      { name: 'document_original_name', definition: 'NVARCHAR(255)' },
      { name: 'status', definition: 'NVARCHAR(50) DEFAULT \'pending\' CHECK (status IN (\'pending\', \'approved\', \'rejected\'))' },
      { name: 'created_at', definition: 'DATETIME2 DEFAULT GETDATE()' },
      { name: 'updated_at', definition: 'DATETIME2 DEFAULT GETDATE()' }
    ];

    for (const column of columnsToAdd) {
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'alumni' AND COLUMN_NAME = '${column.name}')
          BEGIN
            ALTER TABLE alumni ADD ${column.name} ${column.definition};
            PRINT 'Added column: ${column.name}';
          END
        `);
      } catch (err) {
        console.log(`⚠️ Could not add column ${column.name}: ${err.message}`);
      }
    }
    console.log('✅ Alumni table columns updated');

    // Events table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='events' AND xtype='U')
      CREATE TABLE events (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        date DATETIME2 NOT NULL,
        location NVARCHAR(255),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      );
    `);
    console.log('✅ Events table created');

    // Event RSVP table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Event_RSVP' AND xtype='U')
      CREATE TABLE Event_RSVP (
        id INT IDENTITY(1,1) PRIMARY KEY,
        event_id INT FOREIGN KEY REFERENCES events(id),
        user_id INT FOREIGN KEY REFERENCES Users(id),
        rsvp_status NVARCHAR(50) NOT NULL CHECK (rsvp_status IN ('going', 'interested', 'not_going')),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        UNIQUE(event_id, user_id)
      );
    `);
    console.log('✅ Event RSVP table created');

    // Mentorship table
    await pool.request().query(`
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
    `);
    console.log('✅ Mentorship table created');

    // Donations table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Donations' AND xtype='U')
      CREATE TABLE Donations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        donor_id INT FOREIGN KEY REFERENCES Users(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_method NVARCHAR(50),
        payment_id NVARCHAR(255),
        status NVARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      );
    `);
    console.log('✅ Donations table created');

    // Jobs table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Jobs' AND xtype='U')
      CREATE TABLE Jobs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        recruiter_id INT FOREIGN KEY REFERENCES Users(id),
        title NVARCHAR(255) NOT NULL,
        company NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        location NVARCHAR(255),
        job_type NVARCHAR(50),
        salary_range NVARCHAR(100),
        requirements NVARCHAR(MAX),
        status NVARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      );
    `);
    console.log('✅ Jobs table created');

    // Notifications table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
      CREATE TABLE Notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT FOREIGN KEY REFERENCES Users(id),
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX),
        type NVARCHAR(50),
        is_read BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE()
      );
    `);
    console.log('✅ Notifications table created');

    // Career Updates table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CareerUpdates' AND xtype='U')
      CREATE TABLE CareerUpdates (
        id INT IDENTITY(1,1) PRIMARY KEY,
        alumni_id INT FOREIGN KEY REFERENCES Users(id),
        company NVARCHAR(255) NOT NULL,
        designation NVARCHAR(255) NOT NULL,
        start_date DATE,
        end_date DATE,
        is_current BIT DEFAULT 0,
        description NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      );
    `);
    console.log('✅ Career Updates table created');

    // Insert default admin user
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('admin123', 10);
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM Users WHERE email = 'admin@admin.com')
      INSERT INTO Users (email, password, role, status) 
      VALUES ('admin@admin.com', '${hashedPassword}', 'admin', 'active');
    `);
    console.log('✅ Default admin user created');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('You can now start the server with: npm start');
    
    await pool.close();
    
  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    console.error('Please check your database configuration in the .env file');
    process.exit(1);
  }
}

setupDatabase();
