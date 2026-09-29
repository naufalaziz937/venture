'use client';

import Footer from '@/components/seller/Footer';
import Navbar from '@/components/seller/Navbar';
import Sidebar from '@/components/seller/Sidebar';
import { usePathname } from 'next/navigation';

export default function SellerShell({ children }) {
    const pathname = usePathname();
    const isWide = ['/seller', '/seller/orders', '/seller/user-list', '/seller/rentals', '/seller/returns', '/seller/equipment'].includes(pathname);

    return (
        <div>
            <Navbar />
            <div className="flex w-full">
                <Sidebar />
                <div className={isWide ? 'w-full' : 'flex-1'}>{children}</div>
            </div>
            <Footer />
        </div>
    );
}
