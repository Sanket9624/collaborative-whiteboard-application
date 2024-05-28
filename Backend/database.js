const mysql = require('mysql2')
const dotenv = require('dotenv').config()

const db = mysql.createConnection({
            host : process.env.MYSQL_HOST,
            user : process.env.MYSQL_USER,
            password : process.env.MYSQL_PASSWORD,
            database : process.env.MYSQL_DB
})

db.connect(function(err) {
            if (err) {
              console.error('error connecting: ' + err.stack);
              return;
            }
           
            console.log('connected as id ' + db.threadId);
          });
module.exports = db;