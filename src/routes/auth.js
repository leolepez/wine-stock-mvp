const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');

const router = express.Router();

// GET /auth/login
router.get('/login', (req, res) => {
  res.render('auth/login', {
    title: 'Iniciar Sesión',
    error: null,
    csrfToken: req.csrfToken(),
    user: null,
  });
});

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('auth/login', {
        title: 'Iniciar Sesión',
        error: errors.array()[0].msg,
        csrfToken: req.csrfToken(),
        user: null,
      });
    }

    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.render('auth/login', {
          title: 'Iniciar Sesión',
          error: 'Credenciales inválidas',
          csrfToken: req.csrfToken(),
          user: null,
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatch) {
        return res.render('auth/login', {
          title: 'Iniciar Sesión',
          error: 'Credenciales inválidas',
          csrfToken: req.csrfToken(),
          user: null,
        });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.userEmail = user.email;

      res.redirect('/products');
    } catch (error) {
      console.error('Login error:', error);
      res.render('auth/login', {
        title: 'Iniciar Sesión',
        error: 'Error del servidor',
        csrfToken: req.csrfToken(),
        user: null,
      });
    }
  }
);

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;
