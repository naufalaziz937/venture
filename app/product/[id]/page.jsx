"use client"
import { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { useParams } from "next/navigation";
import Loading from "@/components/Loading";
import { useAppContext } from "@/context/AppContext";
import React from "react";

const Product = () => {

    const { id } = useParams();

    const {
        products,
        productsLoaded,
        router,
        addToCart,
        rentalStartDate,
        rentalEndDate,
        updateRentalPeriod,
    } = useAppContext()

    const [mainImage, setMainImage] = useState(null);
    const [productData, setProductData] = useState(null);
    const [hasResolvedProduct, setHasResolvedProduct] = useState(false);
    const [availability, setAvailability] = useState(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const localDate = new Date();
    const today = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    const durationDays = rentalStartDate && rentalEndDate && rentalEndDate >= rentalStartDate
        ? Math.round((new Date(`${rentalEndDate}T00:00:00Z`) - new Date(`${rentalStartDate}T00:00:00Z`)) / 86400000) + 1
        : 0;

    const fetchProductData = async () => {
        const product = products.find(product => product._id === id);
        setProductData(product || null);
        setHasResolvedProduct(productsLoaded);
    }

    useEffect(() => {
        fetchProductData();
    }, [id, products, productsLoaded])

    useEffect(() => {
        if (!productData || !durationDays) return;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setCheckingAvailability(true);
            try {
                const response = await fetch('/api/product/availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: [{ product: productData._id, quantity: 1 }],
                        rentalStartDate,
                        rentalEndDate,
                    }),
                    signal: controller.signal,
                });
                const data = await response.json();
                setAvailability(response.ok ? data : { available: false, message: data.message });
            } catch (error) {
                if (error.name !== 'AbortError') setAvailability({ available: false, message: 'Unable to check availability' });
            } finally {
                setCheckingAvailability(false);
            }
        }, 250);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [productData, rentalStartDate, rentalEndDate, durationDays]);

    if (!hasResolvedProduct) return <Loading />;
    if (!productData) return (
        <>
            <Navbar />
            <main className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
                <h1 className="text-2xl font-medium text-gray-800">Product not found</h1>
                <p className="mt-2 text-gray-500">The product may have been removed or is unavailable.</p>
                <button onClick={() => router.push('/all-products')} className="mt-6 px-6 py-2 bg-green-600 text-white rounded">View products</button>
            </main>
            <Footer />
        </>
    );

    return productData ? (<>
        <Navbar />
        <div className="px-6 md:px-16 lg:px-32 pt-14 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="px-5 lg:px-16 xl:px-20">
                    <div className="rounded-lg overflow-hidden bg-gray-500/10 mb-4">
                        <Image
                            src={mainImage || productData.image[0]}
                            alt="alt"
                            className="w-full h-auto object-cover mix-blend-multiply"
                            width={1280}
                            height={720}
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {productData.image.map((image, index) => (
                            <div
                                key={index}
                                onClick={() => setMainImage(image)}
                                className="cursor-pointer rounded-lg overflow-hidden bg-gray-500/10"
                            >
                                <Image
                                    src={image}
                                    alt="alt"
                                    className="w-full h-auto object-cover mix-blend-multiply"
                                    width={1280}
                                    height={720}
                                />
                            </div>

                        ))}
                    </div>
                </div>

                <div className="flex flex-col">
                    <h1 className="text-3xl font-medium text-gray-800/90 mb-4">
                        {productData.name}
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                            <Image className="h-4 w-4" src={assets.star_icon} alt="star_icon" />
                            <Image className="h-4 w-4" src={assets.star_icon} alt="star_icon" />
                            <Image className="h-4 w-4" src={assets.star_icon} alt="star_icon" />
                            <Image className="h-4 w-4" src={assets.star_icon} alt="star_icon" />
                            <Image
                                className="h-4 w-4"
                                src={assets.star_dull_icon}
                                alt="star_dull_icon"
                            />
                        </div>
                        <p>(4.5)</p>
                    </div>
                    <p className="text-gray-600 mt-3">
                        {productData.description}
                    </p>
                    <p className="text-3xl font-medium mt-6">
                        Rp.{productData.offerPrice}  /day
                        <span className="text-base font-normal text-gray-800/60 line-through ml-2">
                            Rp.{productData.price}  /day
                        </span>
                    </p>
                    {productData.depositAmount > 0 && (
                        <p className="mt-2 text-sm text-blue-700">Refundable security deposit: Rp.{productData.depositAmount.toLocaleString('id-ID')} per unit</p>
                    )}
                    <hr className="bg-gray-600 my-6" />
                    <div className="rounded-lg border border-gray-200 p-4">
                        <p className="font-medium text-gray-800">Choose rental dates</p>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <label className="text-xs text-gray-500">
                                Start date
                                <input
                                    type="date"
                                    min={today}
                                    value={rentalStartDate}
                                    onChange={(e) => updateRentalPeriod(
                                        e.target.value,
                                        rentalEndDate < e.target.value ? e.target.value : rentalEndDate
                                    )}
                                    className="mt-1 w-full rounded border p-2 text-sm"
                                />
                            </label>
                            <label className="text-xs text-gray-500">
                                End date
                                <input
                                    type="date"
                                    min={rentalStartDate || today}
                                    value={rentalEndDate}
                                    onChange={(e) => updateRentalPeriod(rentalStartDate, e.target.value)}
                                    className="mt-1 w-full rounded border p-2 text-sm"
                                />
                            </label>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                            {durationDays} day{durationDays === 1 ? '' : 's'} · Rp.{(productData.offerPrice * durationDays).toLocaleString('id-ID')} per unit
                        </p>
                        {checkingAvailability ? (
                            <p className="mt-1 text-sm text-gray-500">Checking availability...</p>
                        ) : availability?.available ? (
                            <p className="mt-1 text-sm text-green-600">{availability.availability?.[0]?.availableQuantity} available for these dates.</p>
                        ) : availability ? (
                            <p className="mt-1 text-sm text-red-600">{availability.message || 'Unavailable for these dates.'}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-gray-400">This rental period applies to every item in your cart.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-auto border-collapse w-full max-w-72">
                            <tbody>
                                <tr>
                                    <td className="text-gray-600 font-medium">Brand</td>
                                    <td className="text-gray-800/50 ">Generic</td>
                                </tr>
                                <tr>
                                    <td className="text-gray-600 font-medium">Color</td>
                                    <td className="text-gray-800/50 ">Multi</td>
                                </tr>
                                <tr>
                                    <td className="text-gray-600 font-medium">Category</td>
                                    <td className="text-gray-800/50">
                                        {productData.category}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center mt-10 gap-4">
                        <button
                            disabled={checkingAvailability || !availability?.available}
                            onClick={() => addToCart(productData._id, { rentalStartDate, rentalEndDate })}
                            className="w-full py-3.5 bg-gray-100 text-gray-800/80 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add to Cart
                        </button>
                        <button
                            disabled={checkingAvailability || !availability?.available}
                            onClick={async () => {
                                await addToCart(productData._id, { rentalStartDate, rentalEndDate });
                                router.push('/cart');
                            }}
                            className="w-full py-3.5 bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Rent now
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-center">
                <div className="flex flex-col items-center mb-4 mt-16">
                    <p className="text-3xl font-medium">Featured <span className="font-medium text-green-600">Products</span></p>
                    <div className="w-28 h-0.5 bg-green-600 mt-2"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6 pb-14 w-full">
                    {products.slice(0, 5).map((product, index) => <ProductCard key={index} product={product} />)}
                </div>
                <button className="px-8 py-2 mb-16 border rounded text-gray-500/70 hover:bg-slate-50/90 transition">
                    See more
                </button>
            </div>
        </div>
        <Footer />
    </>
    ) : null
};

export default Product;
