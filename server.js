const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const {PrismaClient} = require('@prisma/client');


dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

//import routes
const reservationRoutes = require('./routes/reservations')(prisma);
const tableRoutes = require('./routes/tables')(prisma);
const userRoutes = require('./routes/users')(prisma);

// use roues
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/users', userRoutes);

app.get('/', async (req, res) => res.send('Restaurent reservation API'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error : {
            message: err.message || 'Internal server error',
            status: err.status || 500
        },
    });
});


// Handle Prisma connection errors
prisma.$connect()
    .then(() => console.log('connected to postgres'))
    .catch((err) => {
        console.error('PostgreSQL connection error:', err);
        process.exit(1);
    });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`server is running in port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
  });