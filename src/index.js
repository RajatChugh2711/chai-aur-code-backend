import dotenv from 'dotenv'
import connectDatabase from './db/index.js'
import { app } from './app.js'

dotenv.config({
    path: './.env'
})

connectDatabase()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port ${process.env.PORT || 8000}`)
    })
})
.catch((error) => {
    console.log(`Mongodb connection failed: ${error}`)
})