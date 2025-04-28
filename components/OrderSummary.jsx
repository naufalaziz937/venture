'use client';
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const OrderSummary = () => {
  const {
    router,
    getCartCount,
    getCartAmount,
    getToken,
    user,
    cartItems,
    setCartItems
  } = useAppContext();

  // Alamat
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);

  // Voucher
  const [promoCode, setPromoCode] = useState("");
  const [voucherCode, setVoucherCode] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Load alamat user
  useEffect(() => {
    const fetchUserAddresses = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get("/api/user/get-address", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          setUserAddresses(data.addresses);
          if (data.addresses.length > 0) {
            setSelectedAddress(data.addresses[0]);
          }
        } else {
          toast.error(data.message);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || err.message);
      }
    };
    if (user) fetchUserAddresses();
  }, [user, getToken]);

  const handleAddressSelect = (addr) => {
    setSelectedAddress(addr);
    setIsDropdownOpen(false);
  };

// sebelum: handleApplyPromo
const handleApplyPromo = async () => {
  if (!promoCode) { toast.error("Masukkan kode promo"); return; }
  try {
    const { data } = await axios.get(`/api/voucher/validate?code=${promoCode}`);
    if (!data.success) {
      toast.error(data.message);
      setVoucherCode(null);
      setDiscountAmount(0);
      return;
    }
    const v = data.voucher;
    const subtotal = getCartAmount();
    let discount = 0;
    if (v.type === "fixed") {
      discount = v.amount;
    } else { // percent
      discount = Math.floor((subtotal * v.amount) / 100);
    }
    setVoucherCode(v.code);
    setDiscountAmount(discount);
    toast.success(`Diskon Rp.${discount.toLocaleString("id-ID")}`);
  } catch (err) {
    toast.error("Gagal validasi voucher");
    setVoucherCode(null);
    setDiscountAmount(0);
  }
};

// dan di render:
const subtotal = getCartAmount();
const tax = Math.floor(subtotal * 0.12);
const total = subtotal + tax - discountAmount;


  // Buat order
  const createOrder = async () => {
    try {
      if (!selectedAddress) {
        toast.error("Pilih alamat terlebih dahulu");
        return;
      }
      // Prepare items
      const items = Object.entries(cartItems)
        .map(([product, qty]) => ({ product, quantity: qty }))
        .filter((it) => it.quantity > 0);

      if (items.length === 0) {
        toast.error("Keranjang kosong");
        return;
      }

      const token = await getToken();
      if (!token) {
        toast.error("Anda harus login");
        return;
      }

      // Hitung final amount di backend konsisten
      const { data } = await axios.post(
        "/api/order/create",
        {
          address: selectedAddress._id,
          items,
          voucherCode,
          discountAmount,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        setCartItems({});
        router.push("/order-placed");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Gagal membuat order");
    }
  };


  return (
    <div className="w-full md:w-96 bg-gray-50 p-5">
      <h2 className="text-2xl font-medium text-gray-700">Order Summary</h2>
      <hr className="my-5 border-gray-300" />

      {/* Alamat */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Select Address
        </label>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen((o) => !o)}
            className="w-full text-left px-4 py-2 bg-white border rounded flex justify-between items-center"
          >
            <span>
              {selectedAddress
                ? `${selectedAddress.fullName}, ${selectedAddress.area}, ${selectedAddress.city}`
                : "Choose address"}
            </span>
            <svg
              className={`w-5 h-5 transform transition ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#4B5563"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isDropdownOpen && (
            <ul className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
              {userAddresses.map((addr, idx) => (
                <li
                  key={idx}
                  onClick={() => handleAddressSelect(addr)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {addr.fullName}, {addr.area}, {addr.city}
                </li>
              ))}
              <li
                onClick={() => router.push("/add-address")}
                className="px-4 py-2 text-center text-green-600 hover:bg-gray-100 cursor-pointer"
              >
                + Add New Address
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Voucher */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Promo Code
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter code"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleApplyPromo}
            className="px-4 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Apply
          </button>
        </div>
      </div>

      <hr className="my-5 border-gray-300" />

      {/* Breakdown */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal ({getCartCount()} items)</span>
          <span className="font-medium">Rp.{subtotal.toLocaleString()}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>- Rp.{discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Tax (12%)</span>
          <span className="font-medium">Rp.{tax.toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t pt-3 font-semibold text-lg">
          <span>Total</span>
          <span>Rp.{(total > 0 ? total : 0).toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={createOrder}
        className="mt-6 w-full bg-green-600 text-white py-3 rounded hover:bg-green-700"
      >
        Place Order
      </button>
    </div>
  );
};

export default OrderSummary;
