const express = require('express');

module.exports = function(prisma) {
    const router = express.Router();

    // Create user
    router.post('/', async (req, res, next) => {
        const { username, email, password, isAdmin } = req.body;
        try {
            if (!username || !email || !password) {
                const error = new Error("Username, email or password not specified.");
                error.status = 400;
                throw error;
            }

            const user = await prisma.user.create({
                data: { username, email, password, isAdmin: isAdmin || false }
            });

            res.status(201).json(user);
        } catch (error) {
            next(error);
        }
    });

    // Get all users
    router.get('/', async (req, res, next) => {
        try {
            const users = await prisma.user.findMany();
            res.json(users);
        } catch (error) {
            next(error);
        }
    });

    // Get a user by ID
    router.get('/:id', async (req, res, next) => {
        const { id } = req.params;
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: parseInt(id),
                }
            });

            if (!user) {
                const error = new Error(`No user with id ${id} found`);
                error.status = 404;
                throw error;
            }

            res.json(user);
        } catch (error) {
            next(error);
        }
    });

    // Update a user
    router.patch('/:id', async (req, res, next) => {
        const { id } = req.params;
        const { username, email, password, isAdmin } = req.body;
        try {
            const updates = {};
            if (username) updates.username = username;
            if (email) updates.email = email;
            if (password) updates.password = password;
            if (isAdmin !== undefined) updates.isAdmin = isAdmin;

            if (Object.keys(updates).length === 0) {
                const error = new Error('No fields to update');
                error.status = 400;
                throw error;
            }

            const updateUser = await prisma.user.update({
                where: { id: parseInt(id) },
                data: updates //data: { username, email, password, isAdmin },
            });

            res.json(updateUser);
        } catch (error) {
            if (error.code === 'P2025') {
                const err = new Error(`User with id ${id} not found`);
                err.status = 404;
                return next(err);
            }
            next(error);
        }
    });

    // Delete a user
    router.delete('/:id', async (req, res, next) => {
        try {
          const { id } = req.params;
    
          await prisma.user.delete({
            where: {
              id: parseInt(id)
            }
          });
    
          res.status(204).send();
        } catch (error) {
          if (error.code === 'P2025') {
            const err = new Error(`No user with id ${id} found`);
            err.status = 404;
            return next(err);
          }
          next(error);
        }
    });

    return router;
};
