// node main.js --password xxx

// Get tables for MySQL
const mysql = require('mysql');


const fs = require('fs');

const getConfig = () => {
  const configData = fs.readFileSync('config.json', 'utf8');
  return JSON.parse(configData);
};

const config = getConfig();
const dbName = config.database;
const connection = mysql.createConnection({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.database
});
connection.connect();
const getTables = async () => {
  return new Promise((resolve, reject) => {
    connection.query('SHOW TABLES', (error, results, fields) => {
      if (error) reject(error);
      resolve(results);
    });
  });
};

const getColumns = async (tableName) => {
  return new Promise((resolve, reject) => {
    connection.query(`SHOW COLUMNS FROM ${tableName}`, (error, results, fields) => {
      if (error) reject(error);
      resolve(results);
    });
  });
};



const printTableNames = async (tables) => {
    for (const tableObj of tables) {
      const tableName = tableObj[Object.keys(tableObj)[0]];
      console.log(`Table: ${tableName}`);
      await printColumnNames(tableName); // Print columns below each table
    }
  };
  
  const printColumnNames = async (tableName) => {
    const columns = await getColumns(tableName);
    for (const column of columns) {
      console.log(`  Column: ${column.Field}`);
    }
  };


  const getKeys = async (tableName) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT kcu.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
        WHERE kcu.TABLE_SCHEMA = '${dbName}' AND kcu.TABLE_NAME = '${tableName}'
      `;
  
      connection.query(query, (error, results, fields) => {
        if (error) reject(error);
        resolve(results);
      });
    });
  };
  
  
  const generateRelationshipJson = async (tables) => {
    const relationships = {};
  
    for (const tableObj of tables) {
      const tableName = tableObj[Object.keys(tableObj)[0]];
      const keys = await getKeys(tableName);
  
      relationships[tableName] = {
        primaryKeys: [],
        foreignKeys: {}
      };
  
      for (const key of keys) {
        if (key.CONSTRAINT_NAME === 'PRIMARY') {
          relationships[tableName].primaryKeys.push(key.COLUMN_NAME);
        } else if (key.CONSTRAINT_NAME !== 'UNIQUE') {
          relationships[tableName].foreignKeys[key.COLUMN_NAME] = {
            referencedTable: key.REFERENCED_TABLE_NAME,
            referencedColumnName: key.REFERENCED_COLUMN_NAME
          };
        }
      }
    }
  
    return relationships;
  };
    

// Import required libraries
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path'); // Add this line to import the path module

// Apply CORS middleware
app.use(cors());

// Set the ./public directory as a static directory
app.use(express.static(path.join(__dirname, 'public'))); // Add this line to set the static directory

// Create a new route to get the relationship JSON
app.get('/api/relationships', async (req, res) => {
  try {
    
    const tables = await getTables();
    const relationships = await generateRelationshipJson(tables);
    res.json(relationships);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating relationship JSON');
  }
});

// Create a new route to get tables and columns
app.get('/api/tables', async (req, res) => {
  try {

    const tables = await getTables();
    const tablesWithColumns = {};

    for (const tableObj of tables) {
      const tableName = tableObj[Object.keys(tableObj)[0]];
      const columns = await getColumns(tableName);
      tablesWithColumns[tableName] = columns.map(column => column.Field);
    }

    res.json(tablesWithColumns);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error getting tables and columns');
  } 
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// Close the database connection when the process is terminated
process.on('SIGINT', () => {
  connection.end();
  process.exit();
});