'use client'
import Footer from '@/components/seller/Footer'
import Navbar from '@/components/seller/Navbar'
import Sidebar from '@/components/seller/Sidebar'
import { usePathname } from 'next/navigation'
import React from 'react'

const Layout = ({ children }) => {
  const pathname = usePathname()
  const isDashboard = pathname === '/seller'
  const isOrder = pathname === '/order'
  const isUser = pathname === '/user-list'

  return (
    <div>
      <Navbar />
      <div className="flex w-full">
        <Sidebar />
        <div className={`${isDashboard || isOrder || isUser? 'w-full' : 'flex-1'}`}>
          {children}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Layout
