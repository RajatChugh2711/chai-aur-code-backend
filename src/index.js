import dotenv from 'dotenv'
import connectDB from './db/index.js';
import { app } from './app.js'
dotenv.config({
    path: './env'
})
connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port ${process.env.PORT || 8000}`)
    })
})
.catch((error) => {
    console.log(`Mongodb connection failed: ${error}`)
})
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