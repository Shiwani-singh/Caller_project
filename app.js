import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';
import flash from 'connect-flash';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import multer from 'multer';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', 
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, 
    httpOnly: true, 
    maxAge: 1000 * 60 * 60 * 24 
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  next();
});

app.use(flash());

app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

// Routes with versioning
app.use('/v1', authRoutes);
app.use('/v1', dashboardRoutes);

app.get('/', (req, res) => {
  res.redirect('/v1/signup');
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
 
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'File size too large. Maximum size is 5MB.');
    } else {
      req.flash('error', 'File upload error: ' + err.message);
    }
    return res.redirect('/v1/signup');
  }

  if (err.name === 'ValidationError') {
    req.flash('error', 'Validation error: ' + err.message);
    return res.redirect('/v1/signup');
  }

  req.flash('error', 'Something went wrong. Please try again.');
  res.redirect('/v1/signup');
});

app.use('/{*any}', (req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: { status: 404, stack: 'Page not found' }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
