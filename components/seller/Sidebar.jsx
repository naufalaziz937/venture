import React from 'react';
import Link from 'next/link';
import { assets } from '../../assets/assets';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const SideBar = () => {
    const pathname = usePathname()
    const menuItems = [
        { name: 'Dashboard', path: '/seller', icon: assets.dash },
        { name: 'Add Product', path: '/seller/add-product', icon: assets.add_icon },
        { name: 'Product List', path: '/seller/product-list', icon: assets.product_list_icon },
        { name: 'User Management', path: '/seller/user-list', icon: assets.user },
        { name: 'Orders', path: '/seller/orders', icon: assets.order_icon },
        { name: 'Voucher', path: '/seller/voucher', icon: assets.voucher },
        { name: 'Report', path: '/seller/report', icon: assets.report },
        { name: 'Sanctions', path: '/seller/sanksi', icon: assets.tax },
    ];

    return (
        <div className='md:w-64 w-16 border-r min-h-screen text-base border-gray-300 py-2 flex flex-col'>
            {menuItems.map((item) => {

                const isActive = pathname === item.path;

                return (
                    <Link href={item.path} key={item.name} passHref>
                        <div
                            className={
                                `flex items-center py-3 px-4 gap-3 ${isActive
                                    ? "border-r-4 md:border-r-[6px] bg-green-600/10 border-green-500/90"
                                    : "hover:bg-gray-100/90 border-white"
                                }`
                            }
                        >
                            <Image
                                src={item.icon}
                                alt={`${item.name.toLowerCase()}_icon`}
                                className="w-7 h-7"
                            />
                            <p className='md:block hidden text-center'>{item.name}</p>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default SideBar;
