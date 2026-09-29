import SellerShell from '@/components/seller/SellerShell';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const Layout = async ({ children }) => {
  const { userId } = await auth();
  if (!userId) redirect('/');
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (user.publicMetadata?.role !== 'seller') redirect('/');
  return <SellerShell>{children}</SellerShell>;
}

export default Layout
