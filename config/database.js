const { Sequelize } = require('sequelize');


// Replace these values with your actual database credentials
const DB_NAME = 'bmgf5jemd29cumrpew82';
const DB_USER = 'ucd1axin7gxhirzt';
const DB_PASSWORD = 'SA2APblDmP4CKP6MZRU5';
const DB_HOST = 'bmgf5jemd29cumrpew82-mysql.services.clever-cloud.com';

// Set up the Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: 'mysql',
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('database connected!.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

module.exports = { sequelize, testConnection };
