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
        const orders = events.map(async (event) => {
            const { userId, items, amount, address, date, voucherCode, discountAmount } = event.data;

            // Menyimpan informasi voucher di order jika ada
            const orderData = {
                userId,
                items,
                amount,
                address,
                date,
                voucherCode: voucherCode || null,  // Simpan voucher code jika ada
                discountAmount: discountAmount || 0,  // Simpan discountAmount jika ada
            };

            // Return order data untuk disimpan di database
            return orderData;
        });

        // Tunggu hingga semua data order selesai diproses
        const orderDataArray = await Promise.all(orders);

        // Koneksi ke database
        await connectDB();

        // Insert orders into database
        await Order.insertMany(orderDataArray);

        return { success: true, processed: orderDataArray.length };
    }
)
