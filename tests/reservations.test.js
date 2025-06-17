const request = require('supertest');
const express = require('express');
const reservationRoutes = require('../routes/reservations');
const { PrismaClient } = require('@prisma/client');

jest.mock('@prisma/client');

const app = express();
app.use(express.json());

// Initialize router with mocked Prisma client
const prisma = new PrismaClient();
app.use('/api/reservations', reservationRoutes(prisma));

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

describe('Reservation Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reservations', () => {
    it('should create a new reservation', async () => {
      const mockTable = { id: 1, capacity: 4, isAvailable: true };
      const mockReservation = {
        id: 1,
        date: new Date('2025-06-15').toISOString(),
        time: '19:00',
        people: 2,
        status: 'booked',
        userId: 1,
        tableId: 1,
        user: { id: 1, username: 'John' },
        table: mockTable,
      };
      prisma.table.findFirst.mockResolvedValue(mockTable);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue(mockReservation);
      prisma.table.update.mockResolvedValue({ ...mockTable, isAvailable: false });

      const response = await request(app)
        .post('/api/reservations')
        .send({
          date: '2025-06-15',
          time: '19:00',
          people: 2,
          userId: 1,
        });

      console.log(`POST response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockReservation);
      expect(prisma.table.findFirst).toHaveBeenCalledWith({
        where: { capacity: { gte: 2 }, isAvailable: true },
      });
      expect(prisma.reservation.findFirst).toHaveBeenCalledWith({
        where: {
          tableId: 1,
          date: new Date('2025-06-15'),
          time: '19:00',
          status: { in: ['booked', 'seated'] },
        },
      });
      expect(prisma.reservation.create).toHaveBeenCalledWith({
        data: {
          date: new Date('2025-06-15'),
          time: '19:00',
          people: 2,
          status: 'booked',
          userId: 1,
          tableId: 1,
        },
        include: { user: true, table: true },
      });
      expect(prisma.table.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isAvailable: false },
      });
    }, 10000);

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .send({ date: '2025-06-15' });

      console.log(`POST missing fields response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Date, time, people (positive number), and userId are required');
      expect(prisma.table.findFirst).not.toHaveBeenCalled();
    }, 10000);

    it('should return 400 if no available table', async () => {
      prisma.table.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/reservations')
        .send({
          date: '2025-06-15',
          time: '19:00',
          people: 2,
          userId: 1,
        });

      console.log(`POST no table response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('No available table for this party size');
      expect(prisma.table.findFirst).toHaveBeenCalled();
    }, 10000);

    it('should return 400 if table is already reserved', async () => {
      const mockTable = { id: 1, capacity: 4, isAvailable: true };
      prisma.table.findFirst.mockResolvedValue(mockTable);
      prisma.reservation.findFirst.mockResolvedValue({ id: 1 });

      const response = await request(app)
        .post('/api/reservations')
        .send({
          date: '2025-06-15',
          time: '19:00',
          people: 2,
          userId: 1,
        });

      console.log(`POST reserved table response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Table is already reserved for this time');
      expect(prisma.reservation.findFirst).toHaveBeenCalled();
    }, 10000);
  });

  describe('GET /api/reservations', () => {
    it('should get all reservations', async () => {
      const mockReservations = [
        {
          id: 1,
          date: new Date('2025-06-15').toISOString(),
          time: '19:00',
          people: 2,
          userId: 1,
          tableId: 1,
          user: { id: 1, username: 'John' },
          table: { id: 1, capacity: 4 },
        },
      ];
      prisma.reservation.findMany.mockResolvedValue(mockReservations);

      const response = await request(app).get('/api/reservations');

      console.log(`GET all response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReservations);
      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        include: { user: true, table: true },
      });
    }, 10000);
  });

  describe('GET /api/reservations/:id', () => {
    it('should get a reservation by ID', async () => {
      const mockReservation = {
        id: 1,
        time: '19:00',
        people: 2,
        user: { id: 1, username: 'John' },
        table: { id: 1, capacity: 4 },
      };
      prisma.reservation.findUnique.mockResolvedValue(mockReservation);

      const response = await request(app).get('/api/reservations/1');

      console.log(`GET /:id response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReservation);
      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { user: true, table: true },
      });
    }, 10000);

    it('should return 404 if reservation not found', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/reservations/999');

      console.log(`GET /:id not found response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Reservation not found');
      expect(response.body.error.status).toBe(404);
      expect(prisma.reservation.findUnique).toHaveBeenCalled();
    }, 10000);
  });

  describe('PUT /api/reservations/:id', () => {
    it('should update a reservation', async () => {
      const mockReservation = {
        id: 1,
        time: '20:00',
        people: 3,
        user: { id: 1, username: 'John' },
        table: { id: 1, capacity: 4 },
      };
      prisma.reservation.update.mockResolvedValue(mockReservation);

      const response = await request(app)
        .put('/api/reservations/1')
        .send({ time: '20:00', people: 3 });

      console.log(`PUT response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReservation);
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { date: undefined, time: '20:00', people: 3, status: undefined },
        include: { user: true, table: true },
      });
    }, 10000);

    it('should return 404 if reservation not found', async () => {
      prisma.reservation.update.mockRejectedValue({ code: 'P2025' });

      const response = await request(app)
        .put('/api/reservations/999')
        .send({ time: '20:00' });

      console.log(`PUT not found response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Reservation not found');
      expect(response.body.error.status).toBe(404);
      expect(prisma.reservation.update).toHaveBeenCalled();
    }, 10000);
  });

  describe('PUT /api/reservations/:id/cancel', () => {
    it('should cancel a reservation', async () => {
      const mockReservation = { id: 1, status: 'booked', tableId: 1 };
      const updatedReservation = {
        id: 1,
        status: 'cancelled',
        tableId: 1,
        user: { id: 1, username: 'John' },
        table: { id: 1, capacity: 4 },
      };
      prisma.reservation.findUnique.mockResolvedValue(mockReservation);
      prisma.reservation.update.mockResolvedValue(updatedReservation);
      prisma.table.update.mockResolvedValue({ id: 1, isAvailable: true });

      const response = await request(app).put('/api/reservations/1/cancel');

      console.log(`PUT cancel response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedReservation);
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'cancelled' },
        include: { user: true, table: true },
      });
      expect(prisma.table.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isAvailable: true },
      });
    }, 10000);

    it('should return 404 if reservation not found', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);

      const response = await request(app).put('/api/reservations/999/cancel');

      console.log(`PUT cancel not found response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Reservation not found');
      expect(response.body.error.status).toBe(404);
      expect(prisma.reservation.findUnique).toHaveBeenCalled();
    }, 10000);
  });

  describe('DELETE /api/reservations/:id', () => {
    it('should delete a reservation', async () => {
      const mockReservation = { id: 1, tableId: 1 };
      prisma.reservation.findUnique.mockResolvedValue(mockReservation);
      prisma.reservation.delete.mockResolvedValue(mockReservation);
      prisma.table.update.mockResolvedValue({ id: 1 });

      const response = await request(app).delete('/api/reservations/1');

      console.log(`DELETE response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(prisma.reservation.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.table.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isAvailable: true },
      });
    }, 10000);

    it('should return 404 if reservation not found', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);

      const response = await request(app).delete('/api/reservations/999');

      console.log(`DELETE not found response: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Reservation not found');
      expect(response.body.error.status).toBe(404);
      expect(prisma.reservation.findUnique).toHaveBeenCalled();
    }, 10000);
  });
});