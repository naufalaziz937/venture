
import connectDB from "@/config/db";
import User from "@/models/user";

export const GET = async (request) => {
    try {
        await connectDB();

        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return new Response(JSON.stringify({ error: "User ID not provided" }), { status: 400 });
        }

        const user = await User.findById(userId).select('name');

        if (!user) {
            return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
        }

        return new Response(JSON.stringify({ name: user.name }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch user details" }), { status: 500 });
    }
};