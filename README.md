# 🏙️ Civita - Community Issue Management Platform# Civita - MERN Stack Application



[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)A full-stack web application built with MongoDB, Express.js, React, and Node.js.

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)

[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green.svg)](https://mongodb.com/)## Project Structure

[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)```

civita/

A modern, full-stack web application for community-driven issue reporting and management. Built with the MERN stack (MongoDB, Express.js, React, Node.js), Civita empowers residents to report local issues while providing authorities with tools to track and resolve them efficiently.├── backend/                 # Backend server

│   ├── models/             # MongoDB models

![Civita Dashboard](https://via.placeholder.com/800x400/667eea/ffffff?text=Civita+Dashboard)│   ├── routes/             # API routes

│   ├── controllers/        # Route controllers

## ✨ Features│   ├── middleware/         # Custom middleware

│   ├── config/             # Database configuration

### 🏠 **For Residents**│   └── server.js           # Server entry point

- **Issue Reporting**: Report community issues with photos, location, and detailed descriptions├── frontend/               # React frontend

- **Interactive Map**: View issues on an interactive map with real-time updates│   ├── public/             # Static files

- **Issue Tracking**: Follow the progress of reported issues from submission to resolution│   ├── src/

- **Community Engagement**: Vote, comment, and follow issues that matter to you│   │   ├── components/     # Reusable components

- **Mobile Responsive**: Fully responsive design for all devices│   │   ├── pages/          # Page components

│   │   ├── services/       # API services

### 🏛️ **For Authorities**│   │   ├── context/        # React context

- **Issue Management**: Assign, update status, and manage community issues│   │   └── App.js          # Main App component

- **Analytics Dashboard**: Comprehensive analytics and reporting tools│   └── package.json

- **Category Management**: Organize issues by categories (Roads, Utilities, Safety, etc.)└── package.json            # Root package.json

- **User Management**: Manage residents and authority accounts```

- **Real-time Notifications**: Stay updated on new issues and community feedback

## Getting Started

### 🔐 **Security & Authentication**

- **JWT Authentication**: Secure token-based authentication### Prerequisites

- **Role-based Access Control**: Different permissions for residents, authorities, and admins- Node.js (v14 or higher)

- **Password Reset**: Secure forgot password functionality with email/username verification- MongoDB

- **Rate Limiting**: API rate limiting to prevent abuse- npm or yarn

- **Input Validation**: Comprehensive server-side and client-side validation

### Installation

## 🛠️ Tech Stack

1. Clone the repository

### **Frontend**2. Install dependencies:

- **React 18.x** - Modern UI library with hooks   ```bash

- **React Router 6** - Client-side routing   npm run install-all

- **Axios** - HTTP client for API communication   ```

- **Leaflet** - Interactive maps

- **Context API** - State management3. Create environment files:

- **CSS3** - Modern styling with animations   - Copy `backend/.env.example` to `backend/.env`

   - Update the environment variables

### **Backend**

- **Node.js** - JavaScript runtime4. Start the development servers:

- **Express.js** - Web application framework   ```bash

- **MongoDB** - NoSQL database   npm run dev

- **Mongoose** - MongoDB object modeling   ```

- **JWT** - JSON Web Tokens for authentication

- **Bcrypt** - Password hashingThis will start both the backend server (port 5000) and frontend development server (port 3000).

- **Multer** - File upload handling

- **Helmet** - Security middleware## Available Scripts



### **Development & Deployment**- `npm run dev` - Start both backend and frontend in development mode

- **Git** - Version control- `npm run server` - Start only the backend server

- **ESLint** - Code linting- `npm run client` - Start only the frontend

- **Prettier** - Code formatting- `npm run build` - Build the frontend for production

- **Nodemon** - Development server auto-restart

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18.x or higher)
- **MongoDB** (v6.x or higher)
- **Git**
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/k-i-mahi/proj1.git
   cd proj1
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**
   
   Create `.env` files in both `backend` and `frontend` directories:

   **Backend (.env)**
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/civita
   
   # JWT Configuration
   JWT_SECRET=your_super_secure_jwt_secret_key
   JWT_EXPIRE=7d
   
   # Session Configuration (if using sessions)
   SESSION_SECRET=your_session_secret_key
   
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   HOST=0.0.0.0
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   
   # File Upload (Optional - Cloudinary)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

   **Frontend (.env)**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_MAP_API_KEY=your_map_api_key
   ```

5. **Database Setup**
   
   Start MongoDB and seed the database:
   ```bash
   # In backend directory
   node scripts/seedDatabase.js
   ```

6. **Start the Application**
   
   Open two terminals:
   
   **Terminal 1 - Backend**
   ```bash
   cd backend
   npm start
   ```
   
   **Terminal 2 - Frontend**
   ```bash
   cd frontend
   npm start
   ```

7. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - API Health Check: http://localhost:5000/health

## 📁 Project Structure

```
proj1/
├── backend/                 # Backend server
│   ├── config/             # Database and configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── scripts/           # Database scripts
│   ├── uploads/           # File uploads directory
│   ├── utils/             # Utility functions
│   ├── .env               # Environment variables
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
│
├── frontend/               # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── config/        # Configuration files
│   │   ├── context/       # React Context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   ├── App.js         # Main App component
│   │   └── index.js       # Entry point
│   ├── .env               # Environment variables
│   └── package.json       # Frontend dependencies
│
├── README.md              # Project documentation
└── .gitignore            # Git ignore rules
```

## 🔑 API Endpoints

### **Authentication**
```
POST   /api/auth/register        # User registration
POST   /api/auth/login           # User login
GET    /api/auth/me              # Get current user
PUT    /api/auth/updateprofile   # Update user profile
PUT    /api/auth/updatepassword  # Change password
POST   /api/auth/forgotpassword  # Request password reset
POST   /api/auth/resetpassword   # Reset password
POST   /api/auth/logout          # User logout
```

### **Issues**
```
GET    /api/issues               # Get all issues
POST   /api/issues               # Create new issue
GET    /api/issues/:id           # Get single issue
PUT    /api/issues/:id           # Update issue
DELETE /api/issues/:id           # Delete issue
GET    /api/issues/nearby        # Get nearby issues
```

### **Interactions**
```
POST   /api/interactions/issues/:id/vote      # Vote on issue
POST   /api/interactions/issues/:id/comment   # Comment on issue
POST   /api/interactions/issues/:id/follow    # Follow issue
GET    /api/interactions/issues/:id/stats     # Get issue stats
```

### **Categories**
```
GET    /api/categories           # Get all categories
POST   /api/categories           # Create category (admin)
PUT    /api/categories/:id       # Update category (admin)
DELETE /api/categories/:id       # Delete category (admin)
```

### **Users**
```
GET    /api/users                # Get all users (admin)
GET    /api/users/:id            # Get user profile
PUT    /api/users/:id            # Update user (admin)
DELETE /api/users/:id            # Delete user (admin)
```

## 👥 User Roles

### **Resident**
- Report issues
- Vote and comment on issues
- Follow issue updates
- View public analytics

### **Authority**
- All resident permissions
- Manage assigned issues
- Update issue status
- Access detailed analytics
- Assign issues to other authorities

### **Admin**
- All authority permissions
- User management
- Category management
- System configuration
- Full analytics access

## 🧪 Testing

### **API Testing**
Use the provided endpoints or test manually:
```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john.smith@email.com", "password": "password123"}'
```

### **Default Test Accounts**
After seeding the database:
- **Admin**: admin@civita.com / password123
- **Authority**: sarah.johnson@email.com / password123
- **Resident**: john.smith@email.com / password123

## 🚀 Deployment

### **Environment Setup**
1. Set `NODE_ENV=production` in backend
2. Update MongoDB URI for production database
3. Configure proper JWT secrets
4. Set up HTTPS certificates
5. Configure reverse proxy (Nginx recommended)

### **Cloud Deployment**
- **Frontend**: Deploy to Vercel, Netlify, or AWS S3
- **Backend**: Deploy to Heroku, DigitalOcean, or AWS EC2
- **Database**: MongoDB Atlas or self-hosted MongoDB

## 🔧 Configuration

### **Database Seeding**
The project includes a database seeding script:
```bash
cd backend
node scripts/seedDatabase.js
```

This creates:
- Sample users (admin, authority, residents)
- Issue categories
- Sample issues with interactions
- Location data

### **File Uploads**
Configure file uploads using either:
- **Local storage**: Files stored in `backend/uploads/`
- **Cloudinary**: Cloud-based image management

### **Maps Integration**
- Uses Leaflet for interactive maps
- Supports custom map tiles
- Geolocation for automatic positioning

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### **Development Guidelines**
- Follow existing code style
- Add comments for complex logic
- Write tests for new features
- Update documentation
- Ensure responsive design

## 🐛 Known Issues

- [ ] File upload size limit (10MB default)
- [ ] Map tiles may load slowly on poor connections
- [ ] Session cleanup needs periodic maintenance

## 📝 Changelog

### **v1.0.0** (Current)
- Initial release
- User authentication and authorization
- Issue reporting and management
- Interactive maps
- Real-time notifications
- Analytics dashboard
- Responsive design
- Forgot password functionality

## 📧 Support

For support and questions:
- **Issues**: [GitHub Issues](https://github.com/k-i-mahi/proj1/issues)
- **Email**: support@civita.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Leaflet** for interactive maps
- **MongoDB** for flexible data storage
- **React** community for excellent documentation
- **Express.js** for robust backend framework
- All contributors and community members

---

**Made with ❤️ by [Khadimul Islam Mahi](https://github.com/k-i-mahi)**

---

## 📈 Project Status

🟢 **Active Development** - This project is actively maintained and new features are being added regularly.

**Last Updated**: October 26, 2025