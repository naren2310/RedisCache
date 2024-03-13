const cors    = require("cors");
const express = require("express");
const app     = express();
const mysql   = require('mysql');
const redis   = require('redis');

// Start server
const port = 5000;

// Set json for getting data from request body
app.use(express.json());

// Redis setup
let redisClient;
(async () => {
    redisClient = redis.createClient();
    redisClient.on("error", (error) => console.error(`Error : ${error}`));
    redisClient.on("connect", () => console.log("Redis connected"));
    await redisClient.connect();
})();

// MySQL setup
const DB = mysql.createConnection({
    host    : 'localhost',
    user    : 'root',
    password: 'SmartWork_123',
    database: 'todo_list',
});

// Connect to MySQL
DB.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected');
});

// Sample Get Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Todo List API!');
});

app.post('/todos', async(req,res)=>{
    try {
          // Execute MySQL query to insert data into the todos table
          DB.query('INSERT INTO todos SET ?', req.body, async (err, results) => {
            if (err){
                return res.send({
                    success: false,
                    message: 'Failed insert data',
                    data   : err
                });
            }

            // Return success response
            return res.send({
                success: true,
                message: 'Created data successfully!'
            });
        });
    } catch (error) { // Catch any error
        return res.send({
            success: false,
            message: 'Error',
            data   : error
        });
    }
})


// Fetching data from Database or Redis
app.get('/todos', async (req, res) => {
    try {
        // Check if cached data exists in Redis or not. If yes, return cached data
        const cachedData = await redisClient.get('todos');

        if (cachedData) {
            return res.send({
                success: true,
                message: 'Data retrieved from cache successfully!',
                data   : JSON.parse(cachedData)
            });
        }

        // If cached data doesn't exist, fetch data from database and cache it
        const results = await new Promise((resolve, reject) => {
            DB.query('SELECT * FROM todos', async (err, results) => {
                if (err) reject(err);
                await redisClient.set("todos", JSON.stringify(results));
                resolve(results);
            });
        });

        // If no data found in database, return error message
        if (!results.length) {
            return res.send({
                success: false,
                message: 'No todos found!',
                data   : results
            });
        }

        // Cache data set in Redis
        redisClient.setEx('todos', 100, JSON.stringify(results));

        // Return response
        return res.send({
            success: true,
            message: 'Data retrieved from database successfully!',
            data   : results
        });
    } catch (error) { // Catch any error
        return res.send({
            success: false,
            message: 'Error',
            data   : error
        });
    }
});

// Fetching one data from Database or Redis
app.get('/todos/:id', async (req, res) => {
    try {

        const id = req.params.id;

        // Check if cached data exists in Redis or not. If yes, return cached data
        const cachedData = await redisClient.get('todos');

        if (cachedData) {
            return res.send({
                success: true,
                message: 'Data retrieved from cache successfully!',
                data   : JSON.parse(cachedData)
            });
        }

        // If cached data doesn't exist, fetch data from database and cache it
        const results = await new Promise((resolve, reject) => {
            DB.query(`SELECT * FROM todos where id = ${id}`, async (err, results) => {
                if (err) reject(err);
                await redisClient.set("todos", JSON.stringify(results));
                resolve(results);
            });
        });

        // If no data found in database, return error message
        if (!results.length) {
            return res.send({
                success: false,
                message: 'No todos found!',
                data   : results
            });
        }

        // Cache data set in Redis
        redisClient.setEx('todos', 100, JSON.stringify(results));

        // Return response
        return res.send({
            success: true,
            message: 'Data retrieved from database successfully!',
            data   : results
        });
    } catch (error) { // Catch any error
        return res.send({
            success: false,
            message: 'Error',
            data   : error
        });
    }
});
// Express route to update a todo
app.put('/todos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const newData = req.body.name;

        // Execute MySQL query to update data in the todos table
        DB.query(`UPDATE todos SET name = '${newData}' WHERE id = ${id}`, async (err, results) => {
            if (err) {
                return res.status(500).send({
                    success: false,
                    message: 'Failed to update data.',
                    data   : err
                });
            }

            // Invalidate the cache for the updated todo
            await redisClient.del("todos");

            // Return success response
            return res.send({
                success: true,
                message: 'Updated data successfully!',
                data: results
            });
        });
    } catch (error) {
        // Return error response
        return res.send({
            success: false,
            message: 'Error',
            error: error
        });
    }
});

// Express route to delete a todo
app.delete('/todos/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Execute MySQL query to delete data from the todos table
        DB.query('DELETE FROM todos WHERE id = ?', id, async (err, results) => {
            if (err) {
                return res.status(500).send({
                    success: false,
                    message: 'Failed to delete data.',
                    data   : err
                });
            }

            // Invalidate the cache for the deleted todo
            await redisClient.del("todos");

            // Return success response
            return res.send({
                success: true,
                message: 'Deleted data successfully!',
                data: results
            });
        });
    } catch (error) {
        // Return error response
        return res.send({
            success: false,
            message: 'Error',
            error: error
        });
    }
});


// Listen on port
app.listen(port, () => {
    console.log(`Running at - http://localhost:${port}`);
});