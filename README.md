<!-- Migrate uploads from uploads/ to Azure Blob Storage for persistence. -->

# 🎓 Alumni Management System

A comprehensive web application for managing alumni connections, built with React frontend and Node.js backend, powered by Microsoft Azure SQL Database.

## ✨ Features

### 🔐 Authentication & Security
- **Secure Password Hashing** with bcrypt (12 salt rounds)
- **Azure Active Directory Authentication** for database access
- **JWT-based session management**
- **Role-based access control** (Admin/Alumni)

### 👥 Alumni Management
- **User Registration** with document verification
- **Profile Management** with real-time updates
- **Admin Approval System** for new registrations
- **Email Notifications** for approval/decline status

### 📱 Form Validation
- **Strict Phone Number Validation** (exactly 10 digits)
- **Real-time Input Validation** with visual feedback
- **Email Format Validation**
- **Password Strength Requirements**

### 📅 Event Management
- **Event Creation & Management**
- **Calendar Integration**
- **Automated Email Notifications** to all approved alumni
- **Event Details & RSVP System**

### 📧 Email System
- **Automated Welcome Emails**
- **Event Notification System**
- **Password Reset Functionality**
- **Admin Approval Notifications**

## 🏗️ Tech Stack

### Frontend
- **React 18** with Vite
- **CSS3** with modern styling
- **Responsive Design** for all devices
- **Form Validation** with real-time feedback

### Backend
- **Node.js** with Express.js
- **Microsoft Azure SQL Database**
- **Azure Active Directory Authentication**
- **bcrypt** for password hashing
- **Multer** for file uploads
- **Nodemailer** for email services

### Database
- **Azure SQL Database** with AAD authentication
- **Automatic Table Creation** on startup
- **Optimized Queries** with parameterized statements

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Azure CLI (for authentication)
- Azure SQL Database instance
- Gmail App Password (for email services)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd SIH-2025--Alumni-Management-System-main
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Frontend Setup**
```bash
cd ../frontend
npm install
```

4. **Environment Configuration**
```bash
# Backend .env file
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=your-database-name
AZURE_AD_USERNAME=your-email@yourdomain.com
AZURE_AD_PASSWORD=your-azure-password
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
FRONTEND_URL=http://localhost:3000
PORT=5000
```

5. **Azure Authentication**
```bash
# Login to Azure (for database access)
az login
```

6. **Start the Application**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🔧 Configuration

### Azure SQL Database Setup

1. **Create Azure SQL Database** in Azure Portal
2. **Set up Azure AD Admin** for your SQL server
3. **Add your user to the database**:
```sql
CREATE USER [your-email@yourdomain.com] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [your-email@yourdomain.com];
ALTER ROLE db_datawriter ADD MEMBER [your-email@yourdomain.com];
ALTER ROLE db_ddladmin ADD MEMBER [your-email@yourdomain.com];
```

### Email Configuration

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use the app password** in your `.env` file

## 📊 Database Schema

### Alumni Table
```sql
CREATE TABLE alumni (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL, -- Hashed with bcrypt
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
```

### Events Table
```sql
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
```

## 🔐 Security Features

### Password Security
- **bcrypt Hashing** with 12 salt rounds
- **No plain text passwords** stored in database
- **Secure password comparison** during login

### Input Validation
- **Phone Number**: Exactly 10 digits, numeric only
- **Email**: RFC-compliant email validation
- **Password**: Minimum 6 characters
- **File Upload**: Restricted file types and sizes

### Authentication
- **Azure AD Integration** for database access
- **Session Management** with secure tokens
- **Role-based Access Control**

## 📱 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/forgot-password` - Password reset

### Alumni Management
- `GET /api/alumni` - Get alumni by email
- `PUT /api/alumni/:id` - Update alumni profile
- `GET /api/admin/pending` - Get pending registrations
- `POST /api/admin/:id/approve` - Approve alumni
- `POST /api/admin/:id/decline` - Decline alumni

### Event Management
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/events/date/:date` - Get events by date

## 🎨 UI Components

### Registration Form
- **Real-time validation** with visual feedback
- **File upload** for document verification
- **Phone number formatting** (10 digits only)
- **Password strength indicator**

### Admin Dashboard
- **Pending approvals** management
- **Event creation** and management
- **User statistics** and analytics
- **Email notification** system

### Alumni Dashboard
- **Profile management** with real-time updates
- **Event calendar** integration
- **Document upload** functionality
- **Contact information** management

## 🚀 Deployment

### Azure Deployment
1. **Deploy Backend** to Azure App Service
2. **Deploy Frontend** to Azure Static Web Apps
3. **Configure Environment Variables** in Azure
4. **Set up Managed Identity** for database access

### Environment Variables
```env
# Production Environment
AZURE_SQL_SERVER=your-production-server.database.windows.net
AZURE_SQL_DATABASE=alumni_production
EMAIL_USER=production-email@yourdomain.com
EMAIL_PASS=production-app-password
FRONTEND_URL=https://your-frontend-url.com
PORT=8080
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Manual Testing
1. **Registration Flow**: Test with valid/invalid data
2. **Phone Validation**: Try different phone number formats
3. **Password Security**: Verify hashing in database
4. **Email Notifications**: Test approval/decline emails
5. **Event Management**: Create and manage events

## 📈 Performance Optimizations

- **Database Indexing** on frequently queried columns
- **Connection Pooling** for Azure SQL Database
- **File Upload Optimization** with size limits
- **Email Queue Management** for bulk notifications
- **Caching Strategy** for frequently accessed data

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify Azure AD authentication
   - Check firewall rules
   - Ensure user has proper permissions

2. **Email Not Sending**
   - Verify Gmail app password
   - Check email configuration
   - Test email connection endpoint

3. **Phone Validation Not Working**
   - Clear browser cache
   - Check JavaScript console for errors
   - Verify form validation logic

### Debug Endpoints
- `GET /api/quick-debug` - System status
- `GET /api/test-email` - Email configuration test
- `POST /api/debug-event-notifications` - Event notification test

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Backend Development**: Node.js, Express.js, Azure SQL
- **Frontend Development**: React, CSS3, Responsive Design
- **Database Design**: Azure SQL Database, AAD Authentication
- **Security Implementation**: bcrypt, Input Validation, Role-based Access

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the Azure setup documentation

---

**Built with ❤️ for Alumni Management and Networking**