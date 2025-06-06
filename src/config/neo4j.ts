import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
dotenv.config();

const URI = process.env.NEO4J_URI || '';
const USER = process.env.NEO4J_USER || '';
const PASSWORD = process.env.NEO4J_PASSWORD || '';

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
export default driver;
