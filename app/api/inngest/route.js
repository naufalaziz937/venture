import { serve } from "inngest/next";
import { createUserOrder, inngest, syncUserCreation, syncUserDeletion, syncUserUpdation, updateOrderStatus } from "@/config/inngest";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        syncUserCreation,
        syncUserUpdation,
        syncUserDeletion,
        createUserOrder,
        updateOrderStatus
    ],
});
