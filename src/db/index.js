import mongoose from "mongoose";
import { DB_NAME } from '../constants.js'


const connectDatabase = async () => {
    try {
        const result = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n Mongodb conected !! DB HOST: ${result?.connection?.host}`)
    } catch (error) {
        console.log(`Databse connection error: ${error}`);
        process.exit(1);
    }
}

export default connectDatabase;