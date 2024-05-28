const express = require('express')
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config()
const db = require('./database')
const app = express()

const userRoute = require('./routes/user')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/user',userRoute);

const port = process.env.PORT
app.listen(port,()=>{
            console.log(`port is running on http://localhost:${port}`);
})