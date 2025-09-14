# Azure SQL Database Setup Guide

This application has been configured to use Microsoft Azure SQL Database with Azure Active Directory (AAD) authentication.

## Prerequisites

1. Azure subscription
2. Azure SQL Database instance
3. Azure Active Directory tenant
4. Proper permissions to access the SQL database

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Azure SQL Database Configuration
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=your-database-name

# Azure AD Authentication (REQUIRED - App Registration credentials)
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Server Port
PORT=5000
```

## Azure AD Authentication

**For Student Subscriptions**: You have several options since app registration might not be available:

### Option 1: Azure CLI Authentication (Recommended for Students)

1. **Install Azure CLI** if you haven't already
2. **Login to Azure**:
```bash
az login
```
3. **Keep your current `.env` file** - no changes needed!

The application will automatically use your Azure CLI login.

### Option 2: SQL Server Authentication (Fallback)

If Azure AD doesn't work, the app will automatically try SQL Server authentication using your existing credentials:

```env
# Your current .env file will work as-is
AZURE_SQL_SERVER=propertykhareedo.database.windows.net
AZURE_SQL_DATABASE=SIH
AZURE_AD_USERNAME=pushkar.waykole@vit.edu.in
AZURE_AD_PASSWORD=Pushu@1702
```

### Option 3: App Registration (If Available)

If your subscription allows app registrations:

```env
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id
```

### Prerequisites:

- Your Azure AD user must have access to the Azure SQL Database
- The user must be added as a user in the SQL Database with appropriate permissions
- Your Azure SQL Server must allow Azure AD authentication

## Database Setup

The application will automatically create the required tables when it starts:

1. **alumni** table - stores alumni information
2. **events** table - stores event information

## Required Azure Permissions

Your Azure AD user needs the following permissions:

1. **SQL Database Access**: 
   - Your Azure AD user must be added as a user in the SQL Database
   - Grant appropriate roles: `db_datareader`, `db_datawriter`, `db_ddladmin`

2. **How to Add User to SQL Database**:
   ```sql
   -- Connect to your Azure SQL Database as admin
   CREATE USER [your-email@yourdomain.com] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_datareader ADD MEMBER [your-email@yourdomain.com];
   ALTER ROLE db_datawriter ADD MEMBER [your-email@yourdomain.com];
   ALTER ROLE db_ddladmin ADD MEMBER [your-email@yourdomain.com];
   ```

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. **Create your `.env` file** (copy from the template below):
```bash
# Copy this template to .env and fill in your values
cp .env.template .env
```

3. **Fill in your Azure credentials** in the `.env` file:
   - Get your Azure Client ID, Client Secret, and Tenant ID from Azure Portal
   - Set your Azure SQL Server and Database names
   - Configure your email settings

4. Start the server:
```bash
npm start
```

## Example .env File

```env
# Azure SQL Database Configuration
AZURE_SQL_SERVER=propertykhareedo.database.windows.net
AZURE_SQL_DATABASE=PropertyKhareedo

# Azure AD Authentication (REQUIRED - Your Azure AD credentials)
AZURE_AD_USERNAME=pushkar.waykole@vit.edu.in
AZURE_AD_PASSWORD=Pushu@1702

# Email Configuration
EMAIL_USER=pushkarwaykole73@gmail.com
EMAIL_PASS=your-gmail-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Port
PORT=5000
```

## Troubleshooting

### Common Issues:

1. **Authentication Failed**: 
   - Ensure your Azure AD user has proper permissions on the SQL database
   - Verify your environment variables are set correctly
   - Check that your Azure AD password is correct
   - Make sure your user is added to the SQL Database

2. **Connection Timeout**: 
   - Check your firewall rules and network connectivity
   - Ensure your Azure SQL server allows connections from your IP

3. **Table Creation Failed**: 
   - Verify your Azure AD user has `db_ddladmin` role on the database
   - Check that the database user has been created and has proper permissions

4. **Environment Variables Not Set**: 
   - Make sure all required Azure AD variables are in your `.env` file
   - Restart the server after adding environment variables

### Testing Connection:

The application includes several debug endpoints:
- `GET /api/quick-debug` - General system status
- `GET /api/test-email` - Email configuration test
- `POST /api/debug-event-notifications` - Event notification test

## Security Notes

- Never commit your `.env` file to version control
- Use managed identity in production environments
- Regularly rotate your client secrets
- Follow Azure security best practices for SQL Database access
