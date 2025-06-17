# Restaurent Reservation API

This tutorial builds a RESTful API for a restaurant reservation system, using `PostgreSQL` for data storage, `Prisma` for database interactions, and `Docker Compose` to orchestrate the Node.js app and PostgreSQL database. The API includes CRUD operations for users, tables, and reservations, with comprehensive error handling. Unit tests are included.


- To run API : `npm run dev`
- TO run tests: `npm test`
---

### **Tutorial: Restaurant Reservation System API with Node.js, Express, PostgreSQL, Prisma, and Docker Compose**

This tutorial builds a RESTful API for a restaurant reservation system, using PostgreSQL for data storage, Prisma for database interactions, and Docker Compose to orchestrate the Node.js app and PostgreSQL database. The API includes CRUD operations for users, tables, and reservations, with comprehensive error handling.

---

#### **Step 1: Project Setup**
1. **Initialize a Node.js project**:
   ```bash
   mkdir restaurant-reservation-api
   cd restaurant-reservation-api
   npm init -y
   ```

2. **Install dependencies**:
   Install Express, Prisma, and other necessary packages.
   ```bash
   npm install express @prisma/client dotenv cors
   npm install --save-dev nodemon prisma
   ```

3. **Set up project structure**:
   ```
   restaurant-reservation-api/
   ├── prisma/ # #will be created using npx prisma init command(step 2 below)
   │   ├── schema.prisma #will be created using npx prisma init command. This defines the database models for User, Table, and Reservation.
   │   ├── migrations/ #create manually
   ├── routes/
   │   ├── reservations.js
   │   ├── tables.js
   │   ├── users.js
   ├── .env
   ├── docker-compose.yml
   ├── Dockerfile
   ├── server.js
   ├── package.json
   ```

---

#### **Step 2: Configure PostgreSQL with Prisma**
1. **Initialize Prisma**:
   ```bash
   npx prisma init
   ```
   This creates a `prisma/` folder with `schema.prisma` and a `.env` file.

2. **Define Prisma Schema (`prisma/schema.prisma`)**:
   This defines the database models for **User**, **Table**, and **Reservation**.
   
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
   }

   model User {
     id        Int          @id @default(autoincrement())
     username  String
     email     String       @unique
     password  String
     isAdmin   Boolean      @default(false)
     createdAt DateTime     @default(now())
     updatedAt DateTime     @updatedAt
     reservations Reservation[]
   }

   model Table {
     id          Int          @id @default(autoincrement())
     name        String
     capacity    Int
     isAvailable Boolean      @default(true)
     createdAt   DateTime     @default(now())
     updatedAt   DateTime     @updatedAt
     reservations Reservation[]
   }

   model Reservation {
     id        Int          @id @default(autoincrement())
     date      DateTime
     time      String
     people    Int
     status    String       @default("booked")
     userId    Int
     tableId   Int?
     user      User         @relation(fields: [userId], references: [id])
     table     Table?       @relation(fields: [tableId], references: [id])
     createdAt DateTime     @default(now())
     updatedAt DateTime     @updatedAt
   }
   

3. **Configure `.env` (at root level- not in prisma folder)**:
   
   PORT=3000
   DATABASE_URL=postgresql://postgres:password@db:5432/restaurant?schema=public
   
4. **Run prisma generate**

**you usually don't need to run npx prisma generate separately if you run prisma migrate dev.**
```sh
npx prisma generate
```
1. **Run prosma migrate dev**

`npx prisma migrate dev --name initial`

This runs prisma generate internally, applies any pending migrations to your database,

Creates a new migration file if there are schema changes,

And regenerates the Prisma Client.

So, you usually don't need to run npx prisma generate separately if you run prisma migrate dev.


---
This will generate the necessary Prisma client code inside: `node_modules/.prisma/client/`



#### **Step 3: Set Up Docker Compose**
Create a `docker-compose.yml` to run the Node.js app and PostgreSQL database.
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    depends_on:
      - db
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/restaurant?schema=public
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=restaurant
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Create a `Dockerfile` for the Node.js app.

FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]


---

#### **Step 4: Update `package.json`**
Add scripts for development and Prisma migrations.
```json
{
  "name": "restaurant-reservation-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "prisma:migrate": "npx prisma migrate dev",
    "prisma:generate": "npx prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "prisma": "^5.7.0"
  }
}
```

---

#### **Step 5: Create the Server (`server.js`)**
Set up the Express server with error handling middleware.
```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Import routes
const reservationRoutes = require('./routes/reservations');
const tableRoutes = require('./routes/tables');
const userRoutes = require('./routes/users');

// Use routes
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => res.send('Restaurant Reservation API'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
    },
  });
});

// Handle Prisma connection errors
prisma.$connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
```

---

#### **Step 6: Define Routes with CRUD and Error Handling**
Create routes for **Users**, **Tables**, and **Reservations** with full CRUD operations and proper error handling.

1. **User Routes (`routes/users.js`)**:
   ```javascript
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create a user
router.post('/', async (req, res, next) => {
  try {
    const { username, email, password, isAdmin } = req.body;
    if (!username || !email || !password) {
      const error = new Error('Username, email, and password are required');
      error.status = 400;
      throw error;
    }
    const user = await prisma.user.create({
      data: { username, email, password, isAdmin: isAdmin || false },
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
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update a user
router.put('/:id', async (req, res, next) => {
  try {
    const { username, email, password, isAdmin } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { username, email, password, isAdmin },
    });
    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('User not found');
      err.status = 404;
      return next(err);
    }
    next(error);
  }
});

// Delete a user
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.user.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('User not found');
      err.status = 404;
      return next(err);
    }
    next(error);
  }
});

module.exports = router;
   ```

2. **Table Routes (`routes/tables.js`)**:
   ```javascript
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create a table
router.post('/', async (req, res, next) => {
  try {
    const { name, capacity } = req.body;
    if (!name || !capacity || capacity < 1) {
      const error = new Error('Name and valid capacity are required');
      error.status = 400;
      throw error;
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
    const table = await prisma.table.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!table) {
      const error = new Error('Table not found');
      error.status = 404;
      throw error;
    }
    res.json(table);
  } catch (error) {
    next(error);
  }
});

// Update a table
router.put('/:id', async (req, res, next) => {
  try {
    const { name, capacity, isAvailable } = req.body;
    const table = await prisma.table.update({
      where: { id: parseInt(req.params.id) },
      data: { name, capacity, isAvailable },
    });
    res.json(table);
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Table not found');
      err.status = 404;
      return next(err);
    }
    next(error);
  }
});

// Delete a table
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.table.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Table not found');
      err.status = 404;
      return next(err);
    }
    next(error);
  }
});

module.exports = router;
   ```

3. **Reservation Routes (`routes/reservations.js`)**:
   ```javascript
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create a reservation
router.post('/', async (req, res, next) => {
  try {
    const { date, time, people, userId } = req.body;
    if (!date || !time || !people || !userId || people < 1) {
      const error = new Error('Date, time, people, and userId are required');
      error.status = 400;
      throw error;
    }

    // Find an available table with sufficient capacity
    const table = await prisma.table.findFirst({
      where: { capacity: { gte: people }, isAvailable: true },
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
        time,
        people,
        status: 'booked',
        userId: parseInt(userId),
        tableId: table.id,
      },
      include: { user: true, table: true },
    });

    // Mark table as unavailable
    await prisma.table.update({
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
      data: { date: date ? new Date(date) : undefined, time, people, status },
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

module.exports = router;
   ```

---

#### **Step 7: Run the Application**
1. **Apply Prisma migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```
   This creates the database tables in PostgreSQL.

2. **Start the application with Docker Compose**:
   ```bash
   docker-compose up --build
   ```
   - The Node.js app runs on `http://localhost:5000`.
   - PostgreSQL runs on `localhost:5432`.

3. **Verify the database**:
   Connect to PostgreSQL using a tool like `psql` or TablePlus:
   ```bash
   docker exec -it restaurant-reservation-api_db_1 psql -U postgres -d restaurant
   ```
   Check tables:
   ```sql
   \dt
   ```

---

#### **Step 8: Test the API**
Use **Postman** or **cURL** to test the CRUD endpoints. Below are example requests:

1. **Create a User**:
   ```bash
   curl -X POST http://localhost:5000/api/users \
   -H "Content-Type: application/json" \
   -d '{"username":"John","email":"john@example.com","password":"password123"}'
   ```

2. **Create a Table**:
   ```bash
   curl -X POST http://localhost:5000/api/tables \
   -H "Content-Type: application/json" \
   -d '{"name":"Table 1","capacity":4}'
   ```

3. **Create a Reservation**:
   ```bash
   curl -X POST http://localhost:5000/api/reservations \
   -H "Content-Type: application/json" \
   -d '{"date":"2025-06-15","time":"19:00","people":2,"userId":1}'
   ```

4. **Get All Reservations**:
   ```bash
   curl http://localhost:5000/api/reservations
   ```

5. **Update a Reservation**:
   ```bash
   curl -X PUT http://localhost:5000/api/reservations/1 \
   -H "Content-Type: application/json" \
   -d '{"time":"20:00","people":3}'
   ```

6. **Cancel a Reservation**:
   ```bash
   curl -X PUT http://localhost:5000/api/reservations/1/cancel
   ```

7. **Delete a Table**:
   ```bash
   curl -X DELETE http://localhost:5000/api/tables/1
   ```

---


#### **Step 11: Deployment**
To deploy the application:
1. **Push to a GitHub repository**.
2. **Use a cloud platform** like Heroku, Render, or AWS:
   - Update `DATABASE_URL` in `.env` to point to a hosted PostgreSQL instance (e.g., AWS RDS, Supabase).
   - Deploy the Docker containers or use a Node.js runtime.
3. **Run migrations** on the production database:
   ```bash
   npx prisma migrate deploy
   ```

---
To create **true unit tests** for the restaurant reservation system API (built with Node.js, Express, PostgreSQL, and Prisma), I'll focus on isolating the **route handlers** by **mocking** the Prisma database interactions using **Jest**. Unlike the previous tests, which interacted with an SQLite database, these tests will mock the Prisma client entirely to avoid any database dependency, ensuring pure unit testing. I'll test the **Users**, **Tables**, and **Reservations** routes, covering CRUD operations and error handling, with proper setup instructions.

---

### **Why Mocking?**
- **Isolation**: Unit tests should test the logic of the route handlers without hitting the database.
- **Speed**: Mocking avoids database setup/teardown, making tests faster.
- **Control**: Mocking allows precise control over return values and errors to test edge cases.

---

### **Setup for Unit Tests with Mocking**

#### **Step 1: Install Testing Dependencies**
If not already installed, add Jest and Supertest:
```bash
npm install --save-dev jest supertest @types/jest
```

#### **Step 2: Update `package.json`**
Ensure the test script is configured for Jest:
```json
{
  "name": "restaurant-reservation-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "prisma:migrate": "npx prisma migrate dev",
    "prisma:generate": "npx prisma generate",
    "test": "jest"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "prisma": "^5.7.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.5"
  }
}
```

#### **Step 3: Configure Jest**
Create a Jest configuration file to set up the test environment:
```javascript
module.exports = {
  testEnvironment: 'node',
};
```

#### **Step 4: Mock Prisma Client**
To mock Prisma, we'll use Jest's manual mocks. Create a mock for the Prisma client:
1. Create a `__mocks__` folder in the project root:
   ```
   restaurant-reservation-api/
   ├── __mocks__
   │   ├── @prisma
   │       ├── client.js
   ├── routes/
   │   ├── reservations.js
   │   ├── tables.js
   │   ├── users.js
   ├── tests/
   │   ├── users.test.js
   │   ├── tables.test.js
   │   ├── reservations.test.js
   ├── .env
   ├── docker-compose.yml
   ├── Dockerfile
   ├── jest.config.js
   ├── server.js
   ├── package.json
   ```

2. Create the Prisma mock (`__mocks__/@prisma/client.js`):
   ```javascript
   const mockPrisma = {
     user: {
       create: jest.fn(),
       findMany: jest.fn(),
       findUnique: jest.fn(),
       update: jest.fn(),
       delete: jest.fn(),
     },
     table: {
       create: jest.fn(),
       findMany: jest.fn(),
       findUnique: jest.fn(),
       findFirst: jest.fn(),
       update: jest.fn(),
       delete: jest.fn(),
     },
     reservation: {
       create: jest.fn(),
       findMany: jest.fn(),
       findUnique: jest.fn(),
       findFirst: jest.fn(),
       update: jest.fn(),
       delete: jest.fn(),
     },
   };

   function PrismaClient() {
     return mockPrisma;
   }

   module.exports = { PrismaClient };
   ```

#### **Step 5: Notes on Unit Tests**
- **Mocking**: The Prisma client is mocked to return predefined data or errors, isolating the route logic.
- **No Database**: Tests don’t interact with any database, ensuring true unit tests.
- **Supertest**: Used to simulate HTTP requests to the Express routes.
- **Error Handling**: Tests cover success cases, validation errors, and database-related errors (e.g., record not found).
- **Setup**: Each test file mocks the Prisma client and clears mocks between tests to prevent state leakage.

---

### **Unit Tests with Mocking**

Below are the unit tests for the **Users**, **Tables**, and **Reservations** routes, using mocked Prisma interactions.

1. **User Tests (`tests/users.test.js`)**:
   ```javascript
   const request = require('supertest');
   const express = require('express');
   const userRoutes = require('../routes/users');
   const { PrismaClient } = require('@prisma/client');

   jest.mock('@prisma/client');

   const app = express();
   app.use(express.json());
   app.use('/api/users', userRoutes);

   const prisma = new PrismaClient();

   describe('User Routes', () => {
     beforeEach(() => {
       jest.clearAllMocks();
     });

     describe('POST /api/users', () => {
       it('should create a new user', async () => {
         const mockUser = {
           id: 1,
           username: 'John',
           email: 'john@example.com',
           password: 'password123',
           isAdmin: false,
         };
         prisma.user.create.mockResolvedValue(mockUser);

         const response = await request(app)
           .post('/api/users')
           .send({
             username: 'John',
             email: 'john@example.com',
             password: 'password123',
             isAdmin: false,
           });

         expect(response.status).toBe(201);
         expect(response.body).toEqual(mockUser);
         expect(prisma.user.create).toHaveBeenCalledWith({
           data: {
             username: 'John',
             email: 'john@example.com',
             password: 'password123',
             isAdmin: false,
           },
         });
       });

       it('should return 400 if required fields are missing', async () => {
         const response = await request(app)
           .post('/api/users')
           .send({ username: 'John' });

         expect(response.status).toBe(400);
         expect(response.body.error.message).toBe('Username, email, and password are required');
         expect(prisma.user.create).not.toHaveBeenCalled();
       });
     });

     describe('GET /api/users', () => {
       it('should get all users', async () => {
         const mockUsers = [
           { id: 1, username: 'John', email: 'john@example.com', password: 'password123' },
         ];
         prisma.user.findMany.mockResolvedValue(mockUsers);

         const response = await request(app).get('/api/users');

         expect(response.status).toBe(200);
         expect(response.body).toEqual(mockUsers);
         expect(prisma.user.findMany).toHaveBeenCalled();
       });
     });

     describe('GET /api/users/:id', () => {
       it('should get a user by ID', async () => {
         const mockUser = { id: 1, username: 'John', email: 'john@example.com' };
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
         expect(response.body.error.message).toBe('User not found');
         expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
       });
     });

     describe('PUT /api/users/:id', () => {
       it('should update a user', async () => {
         const mockUser = { id: 1, username: 'Jane', email: 'jane@example.com' };
         prisma.user.update.mockResolvedValue(mockUser);

         const response = await request(app)
           .put('/api/users/1')
           .send({ username: 'Jane', email: 'jane@example.com' });

         expect(response.status).toBe(200);
         expect(response.body).toEqual(mockUser);
         expect(prisma.user.update).toHaveBeenCalledWith({
           where: { id: 1 },
           data: { username: 'Jane', email: 'jane@example.com', password: undefined, isAdmin: undefined },
         });
       });

       it('should return 404 if user not found', async () => {
         prisma.user.update.mockRejectedValue({ code: 'P2025' });

         const response = await request(app)
           .put('/api/users/999')
           .send({ username: 'Jane' });

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('User not found');
         expect(prisma.user.update).toHaveBeenCalled();
       });
     });

     describe('DELETE /api/users/:id', () => {
       it('should delete a user', async () => {
         prisma.user.delete.mockResolvedValue({ id: 1 });

         const response = await request(app).delete('/api/users/1');

         expect(response.status).toBe(204);
         expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
       });

       it('should return 404 if user not found', async () => {
         prisma.user.delete.mockRejectedValue({ code: 'P2025' });

         const response = await request(app).delete('/api/users/999');

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('User not found');
         expect(prisma.user.delete).toHaveBeenCalled();
       });
     });
   });
   ```

2. **Table Tests (`tests/tables.test.js`)**:
   ```javascript
   const request = require('supertest');
   const express = require('express');
   const tableRoutes = require('../routes/tables');
   const { PrismaClient } = require('@prisma/client');

   jest.mock('@prisma/client');

   const app = express();
   app.use(express.json());
   app.use('/api/tables', tableRoutes);

   const prisma = new PrismaClient();

   describe('Table Routes', () => {
     beforeEach(() => {
       jest.clearAllMocks();
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
       });

       it('should return 400 if required fields are missing or invalid', async () => {
         const response = await request(app)
           .post('/api/tables')
           .send({ name: 'Table 1' });

         expect(response.status).toBe(400);
         expect(response.body.error.message).toBe('Name and valid capacity are required');
         expect(prisma.table.create).not.toHaveBeenCalled();
       });
     });

     describe('GET /api/tables', () => {
       it('should get all tables', async () => {
         const mockTables = [{ id: 1, name: 'Table 1', capacity: 4 }];
         prisma.table.findMany.mockResolvedValue(mockTables);

         const response = await request(app).get('/api/tables');

         expect(response.status).toBe(200);
         expect(response.body).toEqual(mockTables);
         expect(prisma.table.findMany).toHaveBeenCalled();
       });
     });

     describe('GET /api/tables/:id', () => {
       it('should get a table by ID', async () => {
         const mockTable = { id: 1, name: 'Table 1', capacity: 4 };
         prisma.table.findUnique.mockResolvedValue(mockTable);

         const response = await request(app).get('/api/tables/1');

         expect(response.status).toBe(200);
         expect(response.body).toEqual(mockTable);
         expect(prisma.table.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
       });

       it('should return 404 if table not found', async () => {
         prisma.table.findUnique.mockResolvedValue(null);

         const response = await request(app).get('/api/tables/999');

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('Table not found');
         expect(prisma.table.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
       });
     });

     describe('PUT /api/tables/:id', () => {
       it('should update a table', async () => {
         const mockTable = { id: 1, name: 'Table 2', capacity: 6, isAvailable: false };
         prisma.table.update.mockResolvedValue(mockTable);

         const response = await request(app)
           .put('/api/tables/1')
           .send({ name: 'Table 2', capacity: 6, isAvailable: false });

         expect(response.status).toBe(200);
         expect(response.body).toEqual(mockTable);
         expect(prisma.table.update).toHaveBeenCalledWith({
           where: { id: 1 },
           data: { name: 'Table 2', capacity: 6, isAvailable: false },
         });
       });

       it('should return 404 if table not found', async () => {
         prisma.table.update.mockRejectedValue({ code: 'P2025' });

         const response = await request(app)
           .put('/api/tables/999')
           .send({ name: 'Table 2' });

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('Table not found');
         expect(prisma.table.update).toHaveBeenCalled();
       });
     });

     describe('DELETE /api/tables/:id', () => {
       it('should delete a table', async () => {
         prisma.table.delete.mockResolvedValue({ id: 1 });

         const response = await request(app).delete('/api/tables/1');

         expect(response.status).toBe(204);
         expect(prisma.table.delete).toHaveBeenCalledWith({ where: { id: 1 } });
       });

       it('should return 404 if table not found', async () => {
         prisma.table.delete.mockRejectedValue({ code: 'P2025' });

         const response = await request(app).delete('/api/tables/999');

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('Table not found');
         expect(prisma.table.delete).toHaveBeenCalled();
       });
     });
   });
   ```

3. **Reservation Tests (`tests/reservations.test.js`)**:
   ```javascript
   const request = require('supertest');
   const express = require('express');
   const reservationRoutes = require('../routes/reservations');
   const { PrismaClient } = require('@prisma/client');

   jest.mock('@prisma/client');

   const app = express();
   app.use(express.json());
   app.use('/api/reservations', reservationRoutes);

   const prisma = new PrismaClient();

   describe('Reservation Routes', () => {
     beforeEach(() => {
       jest.clearAllMocks();
     });

     describe('POST /api/reservations', () => {
       it('should create a new reservation', async () => {
         const mockTable = { id: 1, capacity: 4, isAvailable: true };
         const mockReservation = {
           id: 1,
           date: '2025-06-15',
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
       });

       it('should return 400 if required fields are missing', async () => {
         const response = await request(app)
           .post('/api/reservations')
           .send({ date: '2025-06-15' });

         expect(response.status).toBe(400);
         expect(response.body.error.message).toBe('Date, time, people, and userId are required');
         expect(prisma.table.findFirst).not.toHaveBeenCalled();
       });

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

         expect(response.status).toBe(400);
         expect(response.body.error.message).toBe('No available table for this party size');
         expect(prisma.table.findFirst).toHaveBeenCalled();
       });

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

         expect(response.status).toBe(400);
         expect(response.body.error.message).toBe('Table is already reserved for this time');
         expect(prisma.reservation.findFirst).toHaveBeenCalled();
       });
     });

     describe('GET /api/reservations', () => {
       it('should get all reservations', async () => {
         const mockReservations = [
           { id: 1, date: '2025-06-15', time: '19:00', people: 2, userId: 1, tableId: 1 },
         ];
         prisma.reservation.findMany.mockResolvedValue(mockReservations);

         const response = await request(app).get('/api/reservations');

         expect(response.status).toBe(200);
         expect(response.body).toEqual(mockReservations);
         expect(prisma.reservation.findMany).toHaveBeenCalledWith({
           include: { user: true, table: true },
         });
       });
     });

     describe('GET /api/reservations/:id', () => {
       it('should get a reservation by ID', async () => {
         const mockReservation = { id: 1, time: '19:00', people: 2 };
         prisma.reservation.findUnique.mockResolvedValue(mockReservation);

         const response = await request(app).get('/api/reservations/1');

         expect(response.status).toBe(200);
         expect(response.body).toEqual(mockReservation);
         expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
           where: { id: 1 },
           include: { user: true, table: true },
         });
       });

       it('should return 404 if reservation not found', async () => {
         prisma.reservation.findUnique.mockResolvedValue(null);

         const response = await request(app).get('/api/reservations/999');

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('Reservation not found');
         expect(prisma.reservation.findUnique).toHaveBeenCalled();
       });
     });

     describe('PUT /api/reservations/:id', () => {
       it('should update a reservation', async () => {
         const mockReservation = { id: 1, time: '20:00', people: 3 };
         prisma.reservation.update.mockResolvedValue(mockReservation);

         const response = await request(app)
           .put('/api/reservations/1')
           .send({ time: '20:00', people: 3 });

         expect(response.status).toBe(200);
         expect(response.body).toEqual(mockReservation);
         expect(prisma.reservation.update).toHaveBeenCalledWith({
           where: { id: 1 },
           data: { date: undefined, time: '20:00', people: 3, status: undefined },
           include: { user: true, table: true },
         });
       });

       it('should return 404 if reservation not found', async () => {
         prisma.reservation.update.mockRejectedValue({ code: 'P2025' });

         const response = await request(app)
           .put('/api/reservations/999')
           .send({ time: '20:00' });

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('Reservation not found');
         expect(prisma.reservation.update).toHaveBeenCalled();
       });
     });

     describe('PUT /api/reservations/:id/cancel', () => {
       it('should cancel a reservation', async () => {
         const mockReservation = { id: 1, status: 'booked', tableId: 1 };
         const updatedReservation = { id: 1, status: 'cancelled', tableId: 1 };
         prisma.reservation.findUnique.mockResolvedValue(mockReservation);
         prisma.reservation.update.mockResolvedValue(updatedReservation);
         prisma.table.update.mockResolvedValue({ id: 1, isAvailable: true });

         const response = await request(app).put('/api/reservations/1/cancel');

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
       });

       it('should return 404 if reservation not found', async () => {
         prisma.reservation.findUnique.mockResolvedValue(null);

         const response = await request(app).put('/api/reservations/999/cancel');

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('Reservation not found');
         expect(prisma.reservation.findUnique).toHaveBeenCalled();
       });
     });

     describe('DELETE /api/reservations/:id', () => {
       it('should delete a reservation', async () => {
         const mockReservation = { id: 1, tableId: 1 };
         prisma.reservation.findUnique.mockResolvedValue(mockReservation);
         prisma.reservation.delete.mockResolvedValue(mockReservation);
         prisma.table.update.mockResolvedValue({ id: 1 });

         const response = await request(app).delete('/api/reservations/1');

         expect(response.status).toBe(204);
         expect(prisma.reservation.delete).toHaveBeenCalledWith({ where: { id: 1 } });
         expect(prisma.table.update).toHaveBeenCalledWith({
           where: { id: 1 },
           data: { isAvailable: true },
         });
       });

       it('should return 404 if reservation not found', async () => {
         prisma.reservation.findUnique.mockResolvedValue(null);

         const response = await request(app).delete('/api/reservations/999');

         expect(response.status).toBe(404);
         expect(response.body.error.message).toBe('Reservation not found');
         expect(prisma.reservation.findUnique).toHaveBeenCalled();
       });
     });
   });
   ```

---

### **Running the Tests**

1. **Run the tests**:
   ```bash
   npm test
   ```

2. **Expected Output**:
   Jest will execute all tests and report results. Since Prisma is mocked, no database setup is required, and tests run quickly.

---

### **Test Coverage**

The tests cover:
- **Users**: Create, read (all/single), update, delete, with validation and error cases (e.g., missing fields, non-existent IDs).
- **Tables**: Create, read (all/single), update, delete, with validation and error cases (e.g., invalid capacity).
- **Reservations**: Create, read (all/single), update, cancel, delete, with complex logic (e.g., table availability, conflicts).
- **Mock Verification**: Ensures correct Prisma methods are called with expected arguments.

To generate a coverage report:
```json
"test": "jest --coverage"
```

---

### **Best Practices in Tests**

- **True Unit Tests**: No database interaction; Prisma is fully mocked.
- **Isolation**: `jest.clearAllMocks()` ensures no state leakage between tests.
- **Granularity**: Tests focus on route handler logic, not database behavior.
- **Error Handling**: Covers success paths, validation errors, and mocked database errors (e.g., `P2025` for not found).
- **Maintainability**: Organized by route and operation, with clear mock setups.

---

### **Limitations and Next Steps**

- **Integration Tests**: These are unit tests. For database interaction, use the previous SQLite-based tests or PostgreSQL in CI/CD.
- **Middleware Testing**: Add tests for global error handling middleware if needed.
- **Authentication**: If JWT is added, mock authentication middleware.
- **Complex Mocking**: For more complex scenarios (e.g., transactions), extend the Prisma mock.

---

### **Troubleshooting**

- **Mock Errors**: Ensure `__mocks__/@prisma/client.js` is correctly set up and matches Prisma methods used in routes.
- **Jest Issues**: If tests fail unexpectedly, verify `jest.clearAllMocks()` is called to reset mock state.
- **Route Changes**: If routes are modified, update mock expectations to match new Prisma calls.

---

These unit tests provide thorough coverage of the route handlers, isolating them from the database with Prisma mocking. Let me know if you need additional test cases, help with CI/CD integration, or tests for other parts of the API!