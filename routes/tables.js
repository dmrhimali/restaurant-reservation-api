const express = require('express');

module.exports = function(prisma) {
  const router = express.Router();

  // Create a table
  router.post('/', async (req, res, next) => {
    try {
      const { name, capacity } = req.body;

      if (!name || typeof name !== 'string' || !capacity || !Number.isInteger(capacity) || capacity < 1) {
        const err = new Error('Name (string) and valid capacity (positive integer) are required');
        err.status = 400;
        throw err;
      }

      const table = await prisma.table.create({
        data: { name, capacity, isAvailable: true },
      });

      res.status(201).json(table);
    } catch (error) {
      next(error);
    }
  });

  // Get all tables
  router.get('/', async (req, res, next) => {
    try {
      const tables = await prisma.table.findMany();
      res.json(tables);
    } catch (error) {
      next(error);
    }
  });

  // Get a table by ID
  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const table = await prisma.table.findUnique({
        where: {
          id: parseInt(id),
        },
      });

      if (!table) {
        const err = new Error(`Table with id ${id} not found`);
        err.status = 404;
        throw err;
      }

      res.json(table);
    } catch (error) {
      next(error);
    }
  });

  // Update a table
  router.patch('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, capacity, isAvailable } = req.body;

      const updates = {};
      if (name && typeof name === 'string') updates.name = name;
      if (capacity && Number.isInteger(capacity) && capacity >= 1) updates.capacity = capacity;
      if (isAvailable !== undefined && typeof isAvailable === 'boolean') updates.isAvailable = isAvailable;

      if (Object.keys(updates).length === 0) {
        const error = new Error('No valid fields to update');
        error.status = 400;
        throw error;
      }

      const updatedTable = await prisma.table.update({
        where: {
          id: parseInt(id),
        },
        data: updates,
      });

      res.json(updatedTable);
    } catch (error) {
      if (error.code === 'P2025') {
        const err = new Error(`Table with id ${req.params.id} not found`);
        err.status = 404;
        return next(err);
      }
      next(error);
    }
  });

  // Delete a table
  router.delete('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;

      await prisma.table.delete({
        where: {
          id: parseInt(id),
        },
      });

      res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') {
        const err = new Error(`Table with id ${req.params.id} not found`);
        err.status = 404;
        return next(err);
      }
      next(error);
    }
  });

  return router;
};