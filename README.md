# EatWise - AI-Powered Nutrition Tracking

EatWise is a nutrition tracking application with AI-powered food analysis using OCR and the Groq API.

## 📁 Project Structure

```
eatwise-app/
├── backend/              # Node.js/Express backend
│   ├── config/          # Configuration files (.env)
│   ├── services/        # AI, OCR, and image services
│   ├── server.js        # Main Express server
│   └── package.json     # Backend dependencies
├── frontend/            # Frontend application
│   ├── public/         # HTML pages
│   ├── styles/         # CSS stylesheets
│   └── scripts/        # JavaScript files
└── assets/             # Static assets (Tesseract training data)
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- Groq API key

### Installation

1. **Navigate to the backend directory:**
   ```powershell
   cd backend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Configure environment variables:**
   - The `.env` file is located at `backend/config/.env`
   - It should contain:
     ```
     GROQ_API_KEY=your_groq_api_key_here
     ```

4. **Start the server:**
   ```powershell
   npm start
   ```

   The server will start on `http://localhost:5000`

### Accessing the Application

Once the server is running, open your browser and navigate to:
- **Signup:** `http://localhost:5000/public/index.html`
- **Login:** `http://localhost:5000/public/login.html`
- **Dashboard:** `http://localhost:5000/public/dashboard.html` (after login)

## 🔧 Technology Stack

### Backend
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** bcryptjs
- **AI Service:** Groq API (LLaMA 3.1 model)
- **OCR:** Tesseract.js
- **File Upload:** Multer

### Frontend
- **Pure HTML/CSS/JavaScript** (no framework)
- **Charts:** Chart.js for data visualization

## 📝 Features

- **User Authentication:** Secure signup/login with password hashing
- **Profile Management:** Store user health information
- **AI Food Assistant:** Chat with AI about nutrition
- **Image Analysis:** Scan food labels with OCR and get AI-powered nutrition insights
- **Calorie Tracker:** Track daily calorie and macro intake
- **Personalized Recommendations:** Get health tips based on your profile

## 🔐 Environment Variables

The application uses the following environment variables (located in `backend/config/.env`):

- `GROQ_API_KEY` - Your Groq API key for AI-powered nutrition analysis

## 📦 API Endpoints

- `POST /signup` - Create new user account
- `POST /login` - User login
- `POST /details` - Save user profile details
- `POST /get-profile` - Retrieve user profile
- `POST /ask-ai` - Chat with AI assistant
- `POST /analyze-image` - Upload and analyze food label images

## 🛠️ Development

### Running in Development Mode

For auto-restart on file changes:
```powershell
npm run dev
```

### Project Dependencies

See `backend/package.json` for the complete list of dependencies.

## 📚 Database

The application connects to MongoDB Atlas with the following collections:
- **users** - User accounts and profiles

Connection string is hardcoded in `server.js` (consider moving to environment variables for production).

## 🤝 Contributing

This is a personal nutrition tracking project. Feel free to fork and customize for your own use.

## 📄 License

ISC
