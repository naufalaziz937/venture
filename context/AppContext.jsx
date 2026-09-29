'use client'
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = () => {
    return useContext(AppContext)
}

export const AppContextProvider = (props) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY
    const router = useRouter()

    const { user, isLoaded: isUserLoaded } = useUser()
    const { getToken, isLoaded: isAuthLoaded } = useAuth()

    const [products, setProducts] = useState([])
    const [productsLoaded, setProductsLoaded] = useState(false)
    const [productError, setProductError] = useState(null)
    const [userData, setUserData] = useState(false)
    const [isSeller, setIsSeller] = useState(false)
    const [cartItems, setCartItems] = useState({})
    const localDate = new Date()
    const defaultRentalDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`
    const [rentalStartDate, setRentalStartDate] = useState(defaultRentalDate)
    const [rentalEndDate, setRentalEndDate] = useState(defaultRentalDate)

    const fetchProductData = async () => {
        try {
            setProductError(null)
            const { data } = await axios.get('/api/product/list')
            if (data.success) {
                setProducts(data.product)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Unable to load products'
            setProductError(message)
            toast.error(message)
        } finally {
            setProductsLoaded(true)
        }
    }

    const searchProducts = async (query) => {
        try {
            const { data } = await axios.get(`/api/product/search?q=${query}`);
            if (data.success) {
                setProducts(data.products);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    const fetchUserData = async () => {
        try {
            setIsSeller(user.publicMetadata.role === 'seller')

            const token = await getToken()
            const { data } = await axios.get('/api/user/data', { headers: { Authorization: `Bearer ${token}` } })
            if (data.success) {
                setUserData(data.user)
                setCartItems(data.user.cartItems)
                if (data.user.cartRentalPeriod?.rentalStartDate && data.user.cartRentalPeriod?.rentalEndDate) {
                    const savedStartDate = data.user.cartRentalPeriod.rentalStartDate.slice(0, 10)
                    const savedEndDate = data.user.cartRentalPeriod.rentalEndDate.slice(0, 10)
                    if (savedStartDate >= defaultRentalDate && savedEndDate >= savedStartDate) {
                        setRentalStartDate(savedStartDate)
                        setRentalEndDate(savedEndDate)
                    } else {
                        setRentalStartDate(defaultRentalDate)
                        setRentalEndDate(defaultRentalDate)
                    }
                }
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to load user data')

        }
    }

    const saveCart = async (cartData, startDate = rentalStartDate, endDate = rentalEndDate) => {
        if (!user) return
        const token = await getToken()
        await axios.post('/api/cart/update', {
            cartData,
            rentalStartDate: startDate,
            rentalEndDate: endDate,
        }, { headers: { Authorization: `Bearer ${token}` } })
    }

    const updateRentalPeriod = async (startDate, endDate) => {
        setRentalStartDate(startDate)
        setRentalEndDate(endDate)
        if (user) {
            try {
                await saveCart(cartItems, startDate, endDate)
            } catch (error) {
                toast.error(error.response?.data?.message || 'Unable to save rental dates')
            }
        }
    }

    const addToCart = async (itemId, period = null) => {

        const startDate = period?.rentalStartDate || rentalStartDate
        const endDate = period?.rentalEndDate || rentalEndDate
        if (period) {
            setRentalStartDate(startDate)
            setRentalEndDate(endDate)
        }

        let cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId] += 1;
        }
        else {
            cartData[itemId] = 1;
        }
        setCartItems(cartData);
        if (user) {
            try {
                await saveCart(cartData, startDate, endDate)
                toast.success('Item di masukan ke Cart')
            } catch (error) {
                toast.error(error.message)
            }
        }
    }

    const updateCartQuantity = async (itemId, quantity) => {

        let cartData = structuredClone(cartItems);
        if (quantity === 0) {
            delete cartData[itemId];
        } else {
            cartData[itemId] = quantity;
        }
        setCartItems(cartData)
        if (user) {
            try {
                await saveCart(cartData)
                toast.success('Cart di Update')
            } catch (error) {
                toast.error(error.message)
            }
        }
    }

    const getCartCount = () => {
        let totalCount = 0;
        for (const items in cartItems) {
            if (cartItems[items] > 0) {
                totalCount += cartItems[items];
            }
        }
        return totalCount;
    }

    const getCartAmount = () => {
        let totalAmount = 0;
        for (const items in cartItems) {
            let itemInfo = products.find((product) => product._id === items);
            if (cartItems[items] > 0 && itemInfo) {
                totalAmount += itemInfo.offerPrice * cartItems[items];
            }
        }
        return Math.floor(totalAmount * 100) / 100;
    }

    useEffect(() => {
        fetchProductData()
    }, [])

    useEffect(() => {
        if (isUserLoaded && isAuthLoaded && user) {
            fetchUserData()
        } else if (isUserLoaded && isAuthLoaded && !user) {
            setUserData(false)
            setCartItems({})
            setRentalStartDate(defaultRentalDate)
            setRentalEndDate(defaultRentalDate)
            setIsSeller(false)
        }
    }, [user, isUserLoaded, isAuthLoaded])

    const value = {
        user, getToken, isAuthLoaded: isUserLoaded && isAuthLoaded,
        currency, router,
        isSeller, setIsSeller,
        userData, fetchUserData,
        products, productsLoaded, productError, fetchProductData,
        cartItems, setCartItems,
        rentalStartDate, rentalEndDate, updateRentalPeriod,
        addToCart, updateCartQuantity,
        getCartCount, getCartAmount,
        searchProducts // ✅ Tambahan: search dari API
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}
