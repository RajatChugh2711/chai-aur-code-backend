import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // one who subscribes
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // one who is being subscribed to   
}, 
{ timestamps: true }
)

export const Subscription = mongoose.model('Subscription', subscriptionSchema);