import dotenv from 'dotenv'
import connectDB from './db/index.js';

dotenv.config({
    path: './env'
})
connectDB();
// if-ese
/*
(async () => {
    try {
        const result = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    } catch (error) {
        console.error(`Failed to connect with database ${error}`)
        throw error;
    }
})()
*/