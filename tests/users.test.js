const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const userRoutes = require('../routes/users');

jest.mock('@prisma/client');

const app = express();
app.use(express.json());

// Initialize router with mocked Prisma client
const prisma = new PrismaClient();
app.use('/api/users', userRoutes(prisma));

// Add error-handling middleware (same as server.js)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Internal server error',
        status: err.status || 500,
      },
    });
  });
  
describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: 1,
        username: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
        isAdmin: false,
      };
      prisma.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'Alice',
          email: 'alice@example.com',
          password: 'password123',
          isAdmin: false,
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'Alice',
          email: 'alice@example.com',
          password: 'password123',
          isAdmin: false,
        },
      });
    });

    it('should return 400 for missing required fields', async () => {
        const response = await request(app)
            .post('/api/users')
            .send({ username: 'Alice', email: 'alice@example.com' });
        console.log(`response message: ${JSON.stringify(response.body)}`);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('Username, email or password not specified.');
        expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/users', () => {
    it('should retrieve all users', async () => {
      const mockUsers = [
        { id: 1, username: 'Alice', email: 'alice@example.com', isAdmin: false },
        { id: 2, username: 'Bob', email: 'bob@example.com', isAdmin: true },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith();
    });
  });

  describe('GET /api/users/:id', () => {
    it('should retrieve a user by ID', async () => {
      const mockUser = { id: 1, username: 'Alice', email: 'alice@example.com', isAdmin: false };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app).get('/api/users/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/users/999');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('No user with id 999 found');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update a user with provided fields', async () => {
      const mockUser = { id: 1, username: 'Alice Updated', email: 'alice.new@example.com', isAdmin: true };
      prisma.user.update.mockResolvedValue(mockUser);

      const response = await request(app)
        .patch('/api/users/1')
        .send({ username: 'Alice Updated', email: 'alice.new@example.com', isAdmin: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { username: 'Alice Updated', email: 'alice.new@example.com', isAdmin: true },
      });
    });

    it('should update only specified fields', async () => {
      const mockUser = { id: 1, username: 'Alice', email: 'alice.new@example.com', isAdmin: false };
      prisma.user.update.mockResolvedValue(mockUser);

      const response = await request(app)
        .patch('/api/users/1')
        .send({ email: 'alice.new@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { email: 'alice.new@example.com' },
      });
    });

    it('should return 400 if no fields provided', async () => {
      const response = await request(app)
        .patch('/api/users/1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('No fields to update');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      prisma.user.update.mockRejectedValue({ code: 'P2025' });

      const response = await request(app)
        .patch('/api/users/999')
        .send({ username: 'Alice Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User with id 999 not found');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 999 },
        data: { username: 'Alice Updated' },
      });
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user successfully', async () => {
      prisma.user.delete.mockResolvedValue({ id: 1 });

      const response = await request(app).delete('/api/users/1');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return 404 if user not found', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
  
        const response = await request(app).get('/api/users/999');
  
        console.log(`GET /:id response: ${JSON.stringify(response.body)}`);
        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('No user with id 999 found');
        expect(response.body.error.status).toBe(404);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
      });
  });
});