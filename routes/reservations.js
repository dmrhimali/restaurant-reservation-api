const express = require('express');

module.exports = function (prisma) {
  const router = express.Router();

  // Create a reservation
  router.post('/', async (req, res, next) => {
    try {
      const { date, time, people, userId } = req.body;

      if (!date || !time || !people || people <= 0 || !userId) {
        const error = new Error('Date, time, people (positive number), and userId are required');
        error.status = 400;
        throw error;
      }

      // Find an available table with sufficient capacity
      const table = await prisma.table.findFirst({
        where: {
          capacity: { gte: parseInt(people) },
          isAvailable: true,
        },
      });

      if (!table) {
        const error = new Error('No available table for this party size');
        error.status = 400;
        throw error;
      }

      // Check for conflicting reservations
      const conflictingReservation = await prisma.reservation.findFirst({
        where: {
          tableId: table.id,
          date: new Date(date),
          time,
          status: { in: ['booked', 'seated'] },
        },
      });

      if (conflictingReservation) {
        const error = new Error('Table is already reserved for this time');
        error.status = 400;
        throw error;
      }

      // Create reservation
      const reservation = await prisma.reservation.create({
        data: {
          date: new Date(date),
          time: time,
          people: parseInt(people),
          status: 'booked',
          userId: parseInt(userId),
          tableId: table.id,
        },
        include: {
          user: true,
          table: true,
        },
      });

      // Mark table as unavailable
      const updatedTable = await prisma.table.update({
        where: { id: table.id },
        data: { isAvailable: false },
      });

      res.status(201).json(reservation);
    } catch (error) {
      next(error);
    }
  });

  // Get all reservations
  router.get('/', async (req, res, next) => {
    try {
      const reservations = await prisma.reservation.findMany({
        include: { user: true, table: true },
      });

      res.json(reservations);
    } catch (error) {
      next(error);
    }
  });

  // Get a reservation by ID
  router.get('/:id', async (req, res, next) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { user: true, table: true },
      });
      if (!reservation) {
        const error = new Error('Reservation not found');
        error.status = 404;
        throw error;
      }
      res.json(reservation);
    } catch (error) {
      next(error);
    }
  });

  // Update a reservation
  router.put('/:id', async (req, res, next) => {
    try {
      const { date, time, people, status } = req.body;
      const reservation = await prisma.reservation.update({
        where: { id: parseInt(req.params.id) },
        data: {
          date: date ? new Date(date) : undefined,
          time,
          people: people ? parseInt(people) : undefined,
          status,
        },
        include: { user: true, table: true },
      });
      res.json(reservation);
    } catch (error) {
      if (error.code === 'P2025') {
        const err = new Error('Reservation not found');
        err.status = 404;
        return next(err);
      }
      next(error);
    }
  });

  // Cancel a reservation
  router.put('/:id/cancel', async (req, res, next) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: parseInt(req.params.id) },
      });
      if (!reservation) {
        const error = new Error('Reservation not found');
        error.status = 404;
        throw error;
      }

      const updatedReservation = await prisma.reservation.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'cancelled' },
        include: { user: true, table: true },
      });

      // Mark table as available
      if (reservation.tableId) {
        await prisma.table.update({
          where: { id: reservation.tableId },
          data: { isAvailable: true },
        });
      }

      res.json(updatedReservation);
    } catch (error) {
      next(error);
    }
  });

  // Delete a reservation
  router.delete('/:id', async (req, res, next) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: parseInt(req.params.id) },
      });
      if (!reservation) {
        const error = new Error('Reservation not found');
        error.status = 404;
        throw error;
      }

      await prisma.reservation.delete({
        where: { id: parseInt(req.params.id) },
      });

      // Mark table as available
      if (reservation.tableId) {
        await prisma.table.update({
          where: { id: reservation.tableId },
          data: { isAvailable: true },
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};