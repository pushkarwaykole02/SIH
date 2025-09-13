# Alumni Management System

A comprehensive web-based platform for managing alumni relationships, events, and networking opportunities. Built with React frontend and Node.js backend, featuring document verification, event management, and automated email notifications.

## 🚀 Features

### For Alumni
- **User Registration & Verification**: Secure registration with document upload for verification
- **Profile Management**: Update personal information, academic details, and professional links
- **Event Calendar**: View upcoming events with detailed information
- **Dashboard**: Personalized dashboard with status tracking
- **Email Notifications**: Automated notifications for account status and events
- **Responsive Design**: Mobile-friendly interface

### For Administrators
- **Admin Dashboard**: Comprehensive management interface
- **Registration Approval**: Review and approve/decline alumni registrations
- **Document Verification**: Download and review uploaded documents
- **Event Management**: Create, update, and manage events
- **Bulk Email Notifications**: Send event notifications to all approved alumni
- **Analytics**: View alumni statistics and registration status

### General Features
- **Landing Page**: Modern, responsive homepage with key features
- **Authentication**: Secure login system with role-based access
- **File Upload**: Support for PDF, DOC, DOCX, JPG, PNG files
- **Email Integration**: Automated email system with HTML templates
- **Database Integration**: PostgreSQL database with Supabase
- **API Documentation**: RESTful API endpoints

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** - Modern UI library
- **React Router DOM 7.8.2** - Client-side routing
- **React Icons 5.5.0** - Icon library
- **Vite 7.1.2** - Build tool and dev server
- **CSS3** - Styling with custom components

### Backend
- **Node.js** - Runtime environment
- **Express.js 4.18.2** - Web framework
- **PostgreSQL** - Database (via Supabase)
- **Multer 2.0.2** - File upload handling
- **Nodemailer 6.10.1** - Email service
- **CORS 2.8.5** - Cross-origin resource sharing

### Database
- **PostgreSQL** - Primary database
- **Supabase** - Database hosting and management

## 📁 Project Structure

```
SIH-2025--Alumni-Management-System-main/
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── DashboardNavbar.jsx
│   │   │   ├── EventCalendar.jsx
│   │   │   ├── EventForm.jsx
│   │   │   ├── Landingpage/     # Landing page components
│   │   │   ├── LoginPage/       # Authentication components
│   │   │   └── RegisterPage/    # Registration components
│   │   ├── pages/              # Main application pages
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AlumniDashboard.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.js          # API service functions
│   │   └── css/               # Stylesheets
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── server.js              # Main server file
│   ├── uploads/              # File upload directory
│   ├── package.json
│   └── node_modules/
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database (or Supabase account)
- Gmail account for email services

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
   
   Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   EMAIL_USER=your_gmail_address
   EMAIL_PASS=your_gmail_app_password
   FRONTEND_URL=http://localhost:3000
   PORT=5000
   ```

   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm start
   ```
   Server will run on `http://localhost:5000`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Application will run on `http://localhost:3000`

## 📊 Database Schema

### Alumni Table
```sql
CREATE TABLE alumni (
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
  document_path TEXT,
  document_original_name TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);
```

### Events Table
```sql
CREATE TABLE events (
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
```

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - Register new alumni
- `POST /api/login` - User login
- `POST /api/forgot-password` - Password reset

### Alumni Management
- `GET /api/alumni?email={email}` - Get alumni by email
- `PUT /api/alumni/:id` - Update alumni profile

### Admin Operations
- `GET /api/admin/pending` - Get pending registrations
- `POST /api/admin/:id/approve` - Approve alumni
- `POST /api/admin/:id/decline` - Decline alumni
- `GET /api/admin/document/:id` - Download verification document

### Event Management
- `POST /api/events` - Create new event
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get specific event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/events/date/:date` - Get events by date

## 🎨 Key Components

### Frontend Components
- **LandingPage**: Homepage with hero section and features
- **AdminDashboard**: Admin interface for managing registrations and events
- **AlumniDashboard**: Alumni interface for profile and event management
- **EventCalendar**: Interactive calendar for event display
- **EventForm**: Form for creating and editing events
- **UpdateProfileModal**: Modal for profile updates

### Backend Features
- **File Upload**: Secure file handling with validation
- **Email Service**: Automated email notifications with HTML templates
- **Database Integration**: PostgreSQL with connection pooling
- **Error Handling**: Comprehensive error handling and logging
- **Security**: CORS configuration and input validation

## 📧 Email Templates

The system includes beautifully designed HTML email templates for:
- Account approval notifications
- Account decline notifications
- Password reset emails
- Event notification emails
- Welcome messages

## 🔐 Security Features

- Password-based authentication
- File upload validation
- CORS protection
- Input sanitization
- Secure file storage
- Email verification system

## 🚀 Deployment

### Backend Deployment
1. Set up PostgreSQL database (Supabase recommended)
2. Configure environment variables
3. Deploy to your preferred hosting service (Heroku, Railway, etc.)

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred hosting service
3. Update API URLs in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is developed for SIH 2025 (Smart India Hackathon).

## 👥 Team

Developed as part of Smart India Hackathon 2025.

## 📞 Support

For support and questions, contact: pushkarwaykole73@gmail.com

---

**Note**: This is a comprehensive alumni management system designed to facilitate connections between alumni and educational institutions. The system includes modern web technologies and follows best practices for security and user experience.
