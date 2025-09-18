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

async function updateAlumniTable() {
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

    console.log('Updating alumni table schema...');
    
    // Add missing columns to alumni table
    const columnsToAdd = [
      'user_id INT FOREIGN KEY REFERENCES Users(id)',
      'batch NVARCHAR(50)',
      'website NVARCHAR(500)',
      'company NVARCHAR(255)',
      'designation NVARCHAR(255)',
      'years_experience INT',
      'document_path NVARCHAR(500)',
      'document_original_name NVARCHAR(255)',
      'status NVARCHAR(50) DEFAULT \'pending\' CHECK (status IN (\'pending\', \'approved\', \'rejected\'))',
      'created_at DATETIME2 DEFAULT GETDATE()',
      'updated_at DATETIME2 DEFAULT GETDATE()'
    ];

    for (const column of columnsToAdd) {
      try {
        const columnName = column.split(' ')[0];
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'alumni' AND COLUMN_NAME = '${columnName}')
          BEGIN
            ALTER TABLE alumni ADD ${column};
            PRINT 'Added column: ${columnName}';
          END
          ELSE
          BEGIN
            PRINT 'Column already exists: ${columnName}';
          END
        `);
      } catch (err) {
        console.log(`⚠️ Could not add column ${column.split(' ')[0]}: ${err.message}`);
      }
    }

    console.log('✅ Alumni table schema updated successfully!');
    
    await pool.close();
    
  } catch (err) {
    console.error('❌ Alumni table update failed:', err.message);
    process.exit(1);
  }
}

updateAlumniTable();
