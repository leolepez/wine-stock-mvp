require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const sessionMiddleware = require('./config/session');
const prisma = require('./config/database');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const priceRoutes = require('./routes/prices');
const stockRoutes = require('./routes/stock');
const importRoutes = require('./routes/import');
const { requireAuth } = require('./middleware/auth');

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for HTMX
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware
app.use(sessionMiddleware);

// CSRF protection
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Inject csrfToken and user into res.locals for all views
app.use(async (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = null;

  if (req.session.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { id: true, email: true, role: true },
      });
      res.locals.user = user;
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }

  next();
});

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/prices', priceRoutes);
app.use('/stock', stockRoutes);
app.use('/import', importRoutes);

app.get('/', requireAuth, (req, res) => {
  res.redirect('/products');
});

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).send('Token CSRF inválido');
  } else {
    next(err);
  }
});

// General error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

module.exports = app;
