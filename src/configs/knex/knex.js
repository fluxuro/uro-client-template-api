//knex for mysql2

const KNEX = require('knex');
//get env
require('dotenv').config();
const { database } = require('../config.js');
const knex = KNEX(database);

module.exports = knex;
