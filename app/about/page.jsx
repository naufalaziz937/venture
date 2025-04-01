import { AboutUs } from '@/components/about'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import React from 'react'

const page = () => {
    return (
        <>
            <Navbar />
            <AboutUs />
            <Footer />
        </>
    )
}

export default page