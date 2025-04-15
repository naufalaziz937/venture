import { Inngest } from "inngest";
import connectDB from "./db";
import User from "@/models/user";
import Order from "@/models/order";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "venture-next" });

//inngest function to save user data to a database

export const syncUserCreation = inngest.createFunction(
    {
        id: 'sync-user-from-clerk'
    },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            imageUrl: image_url
        }
        await connectDB()
        await User.create(userData)
    }
)

//inngest function to update user data in database
export const syncUserUpdation = inngest.createFunction(
    {
        id: 'update-user-from-clerk'
    },
    { event: 'clerk/user.update' },
    async ({ event }) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            imageUrl: image_url
        }
        await connectDB()
        await User.findByIdAndUpdate(id, userData)
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

//order
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
        const orders = events.map((event) => {
            return {
                userId: event.data.userId,
                items: event.data.items,
                amount: event.data.amount,
                address: event.data.address,
                date: event.data.date
            }
        })
        await connectDB()
        await Order.insertMany(orders)
        return { success: true, processed: orders.length };
    }
)

// Inngest function to update order status
export const updateOrderStatus = inngest.createFunction(
    {
        id: 'update-order-status',
        batchEvents: {
            maxSize: 5,
            timeout: '5s'
        }
    },
    { event: 'order/status.updated' },
    async ({ events }) => {
        await connectDB();

        const updatedOrders = [];

        for (const event of events) {
            const { orderId, paymentStatus, deliveryStatus } = event.data;

            // Find the order by ID
            const order = await Order.findById(orderId);

            if (!order) {
                continue; // Skip if order is not found
            }

            // Update the order's status fields
            if (paymentStatus) order.paymentStatus = paymentStatus;
            if (deliveryStatus) order.deliveryStatus = deliveryStatus;

            await order.save(); // Save the updated order to the database
            updatedOrders.push(order);
        }

        return {
            success: true,
            processed: updatedOrders.length // Return the number of processed orders
        };
    }
);

