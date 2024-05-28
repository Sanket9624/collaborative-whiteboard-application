const express = require('express')
const dotenv = require('dotenv').config()
const database = require('./database')
const app = express()

const port = process.env.PORT
app.listen(port,()=>{
            console.log(`port is running on http://localhost:${port}`);
})