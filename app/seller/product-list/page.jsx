'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Loading from "@/components/Loading";
import axios from "axios";
import toast from "react-hot-toast";

const ProductList = () => {
  const { router, getToken, user } = useAppContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [files, setFiles] = useState([null, null, null, null]);

  // Modal untuk konfirmasi hapus produk
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Ambil produk seller
  const fetchSellerProduct = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/product/seller-list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) setProducts(data.product);
      else toast.error("Failed to fetch products");
    } catch (err) {
      console.error(err);
      toast.error("Error fetching products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchSellerProduct();
  }, [user]);

  // Handle edit & upload FormData ke API
  const handleEditProduct = async () => {
    if (!selectedProduct) return;
    setEditLoading(true);

    try {
      const form = new FormData();
      form.append("name", selectedProduct.name);
      form.append("description", selectedProduct.description);
      form.append("category", selectedProduct.category);
      form.append("price", selectedProduct.price);
      form.append("offerPrice", selectedProduct.offerPrice);

      // Lampirkan file jika ada
      files.forEach((f) => {
        if (f) form.append("images", f);
      });

      const token = await getToken();
      const { data } = await axios.put(
        `/api/product/update-product/${selectedProduct._id}`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (data.success) {
        toast.success("Product updated successfully");
        setSelectedProduct(null);
        setFiles([null, null, null, null]);
        fetchSellerProduct();
      } else {
        toast.error(data.message || "Failed to update product");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating product");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (id) => {
    try {
      const token = await getToken();
      const { data } = await axios.delete(`/api/product/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success("Product deleted successfully");
        fetchSellerProduct();
        setIsDeleteModalOpen(false);
      } else {
        toast.error(data.message || "Failed to delete product");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting product");
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between">
      {loading ? <Loading /> : (
        <div className="w-full md:p-10 p-4">
          <h2 className="pb-4 text-lg font-medium">All Product</h2>
          <div className="flex flex-col items-center max-w-6xlxl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
            <table className="table-fixed w-full overflow-hidden">
              <thead className="text-gray-900 text-sm text-left">
                <tr>
                  <th className="w-2/3 md:w-2/5 px-4 py-3 font-medium truncate">Product</th>
                  <th className="px-4 py-3 font-medium truncate max-sm:hidden">Category</th>
                  <th className="px-4 py-3 font-medium truncate">Price</th>
                  <th className="px-4 py-3 font-medium truncate max-sm:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-500">
                {products.map((product, index) => (
                  <tr key={index} className="border-t border-gray-500/20">
                    <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                      <div className="bg-gray-500/10 rounded p-2">
                        <Image
                          src={product.image[0]}
                          alt="product Image"
                          className="w-16"
                          width={1280}
                          height={720}
                        />
                      </div>
                      <span className="truncate w-full">{product.name}</span>
                    </td>
                    <td className="px-4 py-3 max-sm:hidden">{product.category}</td>
                    <td className="px-4 py-3">Rp.{product.offerPrice}</td>
                    <td className="px-4 py-3 max-sm:hidden">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="flex items-center gap-1 px-2 md:px-3.5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-xs md:text-sm"
                        >
                          <span className="hidden md:block">Edit</span>
                        </button>
                        <button
                          onClick={() => router.push(`/product/${product._id}`)}
                          className="flex items-center gap-1 px-2 md:px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs md:text-sm"
                        >
                          <span className="hidden md:block">Visit</span>
                          <Image className="h-3.5" src={assets.redirect_icon} alt="redirect_icon" />
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDeleteModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-2 md:px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs md:text-sm"
                        >
                          <span className="hidden md:block">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {isDeleteModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-11/12 md:w-1/2 max-w-xl">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Konfirmasi Hapus Produk</h3>
            <p>Apakah Anda yakin ingin menghapus produk ini?</p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteProduct(selectedProduct._id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductList;
