import mongoose from "mongoose";
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
    try {
        const result = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`Database connected successfully on host: ${result?.connection?.host}`)

    } catch (error) {
        console.error(`Error with connection with database: ${error}`)
        process.exit(1)
    }
}

export default connectDB;