const request = require('supertest');
const express = require('express');
const tableRoutes = require('../routes/tables');
const { PrismaClient } = require('@prisma/client');

jest.mock('@prisma/client');

const app = express();
app.use(express.json());

// Initialize router with mocked Prisma client
const prisma = new PrismaClient();
app.use('/api/tables', tableRoutes(prisma));

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

describe('Table Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/tables', () => {
    it('should create a new table', async () => {
      const mockTable = { id: 1, name: 'Table 1', capacity: 4, isAvailable: true };
      prisma.table.create.mockResolvedValue(mockTable);

      const response = await request(app)
        .post('/api/tables')
        .send({ name: 'Table 1', capacity: 4 });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockTable);
      expect(prisma.table.create).toHaveBeenCalledWith({
        data: { name: 'Table 1', capacity: 4, isAvailable: true },
      });
    }, 15000);

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/tables')
        .send({ name: 'Table 1' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Name (string) and valid capacity (positive integer) are required');
      expect(response.body.error.status).toBe(400);
      expect(prisma.table.create).not.toHaveBeenCalled();
    }, 15000);

    it('should return 400 if capacity is invalid', async () => {
      const response = await request(app)
        .post('/api/tables')
        .send({ name: 'Table 1', capacity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Name (string) and valid capacity (positive integer) are required');
      expect(response.body.error.status).toBe(400);
      expect(prisma.table.create).not.toHaveBeenCalled();
    }, 15000);
  });

  describe('GET /api/tables', () => {
    it('should get all tables', async () => {
      const mockTables = [{ id: 1, name: 'Table 1', capacity: 4, isAvailable: true }];
      prisma.table.findMany.mockResolvedValue(mockTables);

      const response = await request(app).get('/api/tables');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTables);
      expect(prisma.table.findMany).toHaveBeenCalledWith();
    }, 15000);
  });

  describe('GET /api/tables/:id', () => {
    it('should get a table by ID', async () => {
      const mockTable = { id: 1, name: 'Table 1', capacity: 4, isAvailable: true };
      prisma.table.findUnique.mockResolvedValue(mockTable);

      const response = await request(app).get('/api/tables/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTable);
      expect(prisma.table.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    }, 15000);

    it('should return 404 if table not found', async () => {
      prisma.table.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/tables/999');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Table with id 999 not found');
      expect(response.body.error.status).toBe(404);
      expect(prisma.table.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
    }, 15000);
  });

  describe('PATCH /api/tables/:id', () => {
    it('should update a table with all fields', async () => {
      const mockTable = { id: 1, name: 'Table 2', capacity: 6, isAvailable: false };
      prisma.table.update.mockResolvedValue(mockTable);

      const response = await request(app)
        .patch('/api/tables/1')
        .send({ name: 'Table 2', capacity: 6, isAvailable: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTable);
      expect(prisma.table.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Table 2', capacity: 6, isAvailable: false },
      });
    }, 15000);

    it('should update a table with partial fields', async () => {
      const mockTable = { id: 1, name: 'Table 1', capacity: 4, isAvailable: true };
      prisma.table.update.mockResolvedValue(mockTable);

      const response = await request(app)
        .patch('/api/tables/1')
        .send({ name: 'Table 1' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTable);
      expect(prisma.table.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Table 1' },
      });
    }, 15000);

    it('should return 400 if no valid fields provided', async () => {
      const response = await request(app)
        .patch('/api/tables/1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('No valid fields to update');
      expect(response.body.error.status).toBe(400);
      expect(prisma.table.update).not.toHaveBeenCalled();
    }, 15000);

    it('should return 400 if capacity is invalid', async () => {
      const response = await request(app)
        .patch('/api/tables/1')
        .send({ capacity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('No valid fields to update');
      expect(response.body.error.status).toBe(400);
      expect(prisma.table.update).not.toHaveBeenCalled();
    }, 15000);

    it('should return 404 if table not found', async () => {
      prisma.table.update.mockRejectedValue({ code: 'P2025' });

      const response = await request(app)
        .patch('/api/tables/999')
        .send({ name: 'Table 2' });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Table with id 999 not found');
      expect(response.body.error.status).toBe(404);
      expect(prisma.table.update).toHaveBeenCalledWith({
        where: { id: 999 },
        data: { name: 'Table 2' },
      });
    }, 15000);
  });

  describe('DELETE /api/tables/:id', () => {
    it('should delete a table', async () => {
      const mockTable = { id: 1 };
      prisma.table.delete.mockResolvedValue(mockTable);

      const response = await request(app).delete('/api/tables/1');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(prisma.table.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    }, 15000);

    it('should return 404 if table not found', async () => {
      prisma.table.delete.mockRejectedValue({ code: 'P2025' });

      const response = await request(app).delete('/api/tables/999');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Table with id 999 not found');
      expect(response.body.error.status).toBe(404);
      expect(prisma.table.delete).toHaveBeenCalledWith({ where: { id: 999 } });
    }, 15000);
  });
});