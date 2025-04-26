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

  // Address
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);

  // Voucher
  const [promoCode, setPromoCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Fetch user addresses
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

  useEffect(() => {
    if (user) fetchUserAddresses();
  }, [user]);

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setIsDropdownOpen(false);
  };

  // Apply voucher
  const handleApplyPromo = async () => {
    if (!promoCode) {
      toast.error("Masukkan kode promo");
      return;
    }
    try {
      const { data } = await axios.get(`/api/voucher/validate?code=${promoCode}`);
      if (data.success) {
        const v = data.voucher;
        let discount = 0;
        const subtotal = getCartAmount();
        if (v.type === "fixed") discount = v.amount;
        else if (v.type === "percent") discount = Math.floor(subtotal * (v.amount / 100));
        setAppliedVoucher(v);
        setDiscountAmount(discount);
        toast.success(
          `Kode berhasil digunakan! ${
            v.type === "fixed"
              ? `Diskon Rp.${v.amount.toLocaleString("id-ID")}`
              : `Diskon ${v.amount}%`
          }`
        );
      } else {
        toast.error(data.message || "Kode tidak valid");
        setAppliedVoucher(null);
        setDiscountAmount(0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memvalidasi voucher");
      setAppliedVoucher(null);
      setDiscountAmount(0);
    }
  };

  // Create order
  const createOrder = async () => {
    try {
      if (!selectedAddress) {
        toast.error("Please select an address");
        return;
      }
      const items = Object.keys(cartItems)
        .map((key) => ({ product: key, quantity: cartItems[key] }))
        .filter((i) => i.quantity > 0);
      if (items.length === 0) {
        toast.error("Cart is empty");
        return;
      }
      const token = await getToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      const { data } = await axios.post(
        "/api/order/create",
        {
          address: selectedAddress._id,
          items,
          voucher: appliedVoucher?.code || null, // kirim kode voucher ke backend bila ada
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
      toast.error(err.response?.data?.message || "Failed to create order");
    }
  };

  // Hitung totals
  const subtotal = getCartAmount();
  const tax = Math.floor(subtotal * 0.12);
  const total = subtotal + tax - discountAmount;

  return (
    <div className="w-full md:w-96 bg-gray-500/5 p-5">
      <h2 className="text-xl md:text-2xl font-medium text-gray-700">
        Order Summary
      </h2>
      <hr className="border-gray-500/30 my-5" />

      {/* Address selector */}
      <div className="space-y-6">
        <div>
          <label className="text-base font-medium uppercase text-gray-600 block mb-2">
            Select Address
          </label>
          <div className="relative inline-block w-full text-sm border">
            <button
              className="peer w-full text-left px-4 pr-2 py-2 bg-white text-gray-700 focus:outline-none"
              onClick={() => setIsDropdownOpen((o) => !o)}
            >
              {selectedAddress
                ? `${selectedAddress.fullName}, ${selectedAddress.area}, ${selectedAddress.city}, ${selectedAddress.state}`
                : "Select Address"}
              <span className="float-right">
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isDropdownOpen ? "" : "-rotate-90"
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#6B7280"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </button>
            {isDropdownOpen && (
              <ul className="absolute w-full bg-white border shadow-md mt-1 z-10 py-1.5">
                {userAddresses.map((addr, i) => (
                  <li
                    key={i}
                    className="px-4 py-2 hover:bg-gray-500/10 cursor-pointer"
                    onClick={() => handleAddressSelect(addr)}
                  >
                    {addr.fullName}, {addr.area}, {addr.city}, {addr.state}
                  </li>
                ))}
                <li
                  className="px-4 py-2 hover:bg-gray-500/10 cursor-pointer text-center"
                  onClick={() => router.push("/add-address")}
                >
                  + Add New Address
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Promo code */}
        <div>
          <label className="text-base font-medium uppercase text-gray-600 block mb-2">
            Promo Code
          </label>
          <div className="flex flex-col items-start gap-3">
            <input
              type="text"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="w-full p-2.5 border outline-none"
            />
            <button
              onClick={handleApplyPromo}
              className="bg-green-600 text-white px-9 py-2 hover:bg-green-700"
            >
              Apply
            </button>
          </div>
        </div>

        <hr className="border-gray-500/30 my-5" />

        {/* Price breakdown */}
        <div className="space-y-4">
          <div className="flex justify-between text-base font-medium">
            <p className="uppercase text-gray-600">Items {getCartCount()}</p>
            <p className="text-gray-800">Rp.{subtotal.toLocaleString()}</p>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between">
              <p className="text-green-600">Promo Discount</p>
              <p className="text-green-600">
                - Rp.{discountAmount.toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <p className="text-gray-600">Shipping Fee</p>
            <p className="font-medium text-gray-800">Free</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Tax (12%)</p>
            <p className="font-medium text-gray-800">Rp.{tax.toLocaleString()}</p>
          </div>
          <div className="flex justify-between text-lg md:text-xl font-medium border-t pt-3">
            <p>Total</p>
            <p>Rp.{(total > 0 ? total : 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <button
        onClick={createOrder}
        className="w-full bg-green-600 text-white py-3 mt-5 hover:bg-green-700"
      >
        Place Order
      </button>
    </div>
  );
};

export default OrderSummary;
