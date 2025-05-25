"use client";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const AllProducts = () => {
    const searchParams = useSearchParams();
    const query = searchParams.get("q")?.toLowerCase() || "";

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/product/search?q=${query}`);
                const data = await res.json();
                if (data.success) {
                    setProducts(data.products);
                }
            } catch (err) {
                console.error("Failed to fetch products", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [query]);

    return (
        <>
            <Navbar />
            <div className="flex flex-col items-start px-6 md:px-16 lg:px-32">
                <div className="flex flex-col items-end pt-12 w-full">
                    <p className="text-2xl font-medium">
                        {query ? `Search results for "${query}"` : "All products"}
                    </p>
                    <div className="w-16 h-0.5 bg-green-600 rounded-full"></div>
                </div>

                {loading ? (
                    <p className="mt-12 pb-14 text-gray-500">Loading...</p>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-12 pb-14 w-full">
                        {products.map((product, index) => (
                            <ProductCard key={index} product={product} />
                        ))}
                    </div>
                ) : (
                    <p className="mt-12 pb-14 text-gray-500">No products found.</p>
                )}
            </div>
            <Footer />
        </>
    );
};

export default AllProducts;
