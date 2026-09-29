import { Inngest } from "inngest";
import connectDB from "./db";
import User from "@/models/user";
import Order from "@/models/order";
import { upsertClerkUser } from "@/lib/syncClerkUser";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "venture-next" });

//inngest function to save user data to a database

export const syncUserCreation = inngest.createFunction(
    {
        id: 'sync-user-from-clerk'
    },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        await connectDB()
        await upsertClerkUser(event.data)
    }
)

//inngest function to update user data in database
export const syncUserUpdation = inngest.createFunction(
    {
        id: 'update-user-from-clerk'
    },
    { event: 'clerk/user.update' },
    async ({ event }) => {
        await connectDB()
        await upsertClerkUser(event.data)
    }
)

// inngest function to delete user from database
export const syncUserDeletion = inngest.createFunction(
    {
        id: 'delete-user-with-clerk'
    },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { id } = event.data

        await connectDB()
        await User.findByIdAndDelete(id)
    }
)

// order
export const createUserOrder = inngest.createFunction(
    {
        id: 'create-user-order',
        batchEvents: {
            maxSize: 5,
            timeout: '5s'
        }
    },
    { event: 'order/created' },
    async ({ events }) => {
        await connectDB();
        const orderIds = [...new Set(events.map(event => event.data.orderId).filter(Boolean))];
        const existingOrders = await Order.countDocuments({ _id: { $in: orderIds } });
        return { success: true, processed: orderIds.length, existingOrders };
    }
)
