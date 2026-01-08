# Alumni Management System - Startup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Microsoft SQL Server (Azure SQL Database)
- Git

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with your database configuration
# Copy the following template and fill in your details:

# Database Configuration
DB_SERVER=your-server.database.windows.net
DB_DATABASE=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Setup database tables (run this first!)
npm run setup

# Start the backend server
npm start
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 🔧 Troubleshooting

### Common Issues

1. **404 Error on API calls**
   - Make sure the backend server is running on port 5000
   - Check that the frontend is running on port 5173
   - Verify the Vite proxy configuration in `frontend/vite.config.js`

2. **500 Internal Server Error**
   - Run `npm run setup` in the backend directory to create database tables
   - Check your database credentials in the `.env` file
   - Ensure your Azure SQL Database is accessible
   - Check firewall settings for your database server

3. **Database Connection Issues**
   - Verify your database credentials in the `.env` file
   - Ensure your Azure SQL Database is accessible
   - Check firewall settings for your database server
   - Test connection with: `curl http://localhost:5000/api/health`

4. **CORS Errors**
   - The backend is configured to allow requests from `http://localhost:5173`
   - If you're using a different port, update the CORS configuration in `backend/server.js`

5. **Tables Don't Exist Errors**
   - Run `npm run setup` in the backend directory
   - Check database status with: `curl http://localhost:5000/api/db-status`

### Default Admin Credentials

For testing purposes, you can use:
- **Email**: admin@alumniconnect.com
- **Password**: admin123

## 📁 Project Structure

```
SIH/
├── backend/
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   └── .env               # Environment variables (create this)
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── css/          # Stylesheets
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
└── STARTUP_GUIDE.md       # This file
```

## 🎯 Features Available

### ✅ Completed Features
- **User Authentication**: Login/Register with role-based access
- **Alumni Dashboard**: Profile management, career timeline, donations
- **Student Dashboard**: Event RSVP, mentorship requests
- **Recruiter Dashboard**: Job posting, alumni directory
- **Admin Dashboard**: User management, analytics, system oversight
- **Event Management**: Create events, RSVP functionality
- **Mentorship System**: Mentor registration, student requests
- **Donations Module**: Payment integration ready
- **Analytics Dashboard**: Comprehensive metrics and insights
- **Recommendation Engine**: AI-powered matching system
- **Notification System**: Real-time notifications
- **Career Timeline**: Professional growth tracking

### 🔐 User Roles
- **Admin**: Full system access and management
- **Alumni**: Profile management, networking, donations
- **Student**: Event participation, mentorship requests
- **Recruiter**: Job posting, candidate search

## 🚀 Production Deployment

For production deployment:

1. **Backend**: Deploy to Azure App Service, Heroku, or similar
2. **Frontend**: Deploy to Azure Static Web Apps, Vercel, or Netlify
3. **Database**: Use Azure SQL Database or similar cloud database
4. **Environment Variables**: Set production environment variables

## 📞 Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure both servers are running on the correct ports
4. Check database connectivity and permissions

---

**Happy Coding! 🎉**
