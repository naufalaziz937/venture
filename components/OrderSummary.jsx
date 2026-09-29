'use client';
import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const OrderSummary = () => {
  const {
    router,
    getCartCount,
    getCartAmount,
    getToken,
    user,
    cartItems,
    setCartItems,
    rentalStartDate,
    rentalEndDate,
    updateRentalPeriod,
    products,
  } = useAppContext();

  // Alamat
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [isPlacedOrderClicked, setIsPlacedOrderClicked] = useState(false);


  // Voucher
  const [promoCode, setPromoCode] = useState("");
  const [voucherCode, setVoucherCode] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const localDate = new Date();
  const today = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const checkoutKeyRef = useRef(null);
  const getCheckoutKey = () => {
    if (!checkoutKeyRef.current) checkoutKeyRef.current = crypto.randomUUID().replaceAll('-', '_');
    return checkoutKeyRef.current;
  };

  useEffect(() => {
    checkoutKeyRef.current = null;
  }, [cartItems, rentalStartDate, rentalEndDate]);

  const durationDays = rentalStartDate && rentalEndDate && rentalEndDate >= rentalStartDate
    ? Math.round((new Date(`${rentalEndDate}T00:00:00Z`) - new Date(`${rentalStartDate}T00:00:00Z`)) / 86400000) + 1
    : 0;

  useEffect(() => {
    const items = Object.entries(cartItems)
      .map(([product, quantity]) => ({ product, quantity }))
      .filter(item => Number.isInteger(item.quantity) && item.quantity > 0);
    if (!durationDays || items.length === 0) {
      setAvailability(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const { data } = await axios.post('/api/product/availability', {
          items, rentalStartDate, rentalEndDate,
        }, { signal: controller.signal });
        setAvailability(data);
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setAvailability({ available: false, message: error.response?.data?.message || 'Unable to check availability' });
        }
      } finally {
        setCheckingAvailability(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cartItems, rentalStartDate, rentalEndDate, durationDays]);

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
      const subtotal = getCartAmount() * durationDays;
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
  const subtotal = getCartAmount() * durationDays;
  const depositAmount = Object.entries(cartItems).reduce((totalDeposit, [productId, quantity]) => {
    const product = products.find(item => item._id === productId);
    return totalDeposit + Number(product?.depositAmount || 0) * quantity;
  }, 0);
  const tax = Math.floor(subtotal * 0.12);
  const total = subtotal + tax - discountAmount + depositAmount;


  // Buat order
  const createOrder = async () => {
    try {
      if (!selectedAddress) {
        toast.error("Pilih alamat terlebih dahulu");
        return;
      }
      if (!availability?.available) {
        toast.error('Selected products are not available for these dates');
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
          rentalStartDate,
          rentalEndDate,
        },
        { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': getCheckoutKey() } }
      );

      if (data.success) {
        toast.success(data.message);
        setCartItems({});
        checkoutKeyRef.current = null;
        router.push("/order-placed");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Gagal membuat order");
    }
  };

  const createOrderStripe = async () => {
    try {

      if (!selectedAddress) {
        toast.error("Pilih alamat terlebih dahulu");
        return;
      }
      if (!availability?.available) {
        toast.error('Selected products are not available for these dates');
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
        "/api/order/stripe",
        {
          address: selectedAddress._id,
          items,
          voucherCode,
          discountAmount,
          rentalStartDate,
          rentalEndDate,
        },
        { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': getCheckoutKey() } }
      );

      if (data.success) {
        window.location.href = data.url
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="w-full md:w-96 bg-gray-50 p-5">
      <h2 className="text-2xl font-medium text-gray-700">Order Summary</h2>
      <hr className="my-5 border-gray-300" />

      <div className="mb-6">
        <p className="block text-sm font-medium text-gray-600 mb-2">Rental period</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            Start date
            <input
              type="date"
              min={today}
              value={rentalStartDate}
              onChange={(e) => {
                const nextEndDate = rentalEndDate < e.target.value ? e.target.value : rentalEndDate;
                updateRentalPeriod(e.target.value, nextEndDate);
                setVoucherCode(null);
                setDiscountAmount(0);
              }}
              className="mt-1 w-full p-2 border rounded text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            End date
            <input
              type="date"
              min={rentalStartDate || today}
              value={rentalEndDate}
              onChange={(e) => {
                updateRentalPeriod(rentalStartDate, e.target.value);
                setVoucherCode(null);
                setDiscountAmount(0);
              }}
              className="mt-1 w-full p-2 border rounded text-sm"
            />
          </label>
        </div>
        <p className="mt-2 text-sm text-gray-600">{durationDays || 0} rental day{durationDays === 1 ? '' : 's'}</p>
        {checkingAvailability ? (
          <p className="mt-1 text-sm text-gray-500">Checking availability...</p>
        ) : availability?.available ? (
          <p className="mt-1 text-sm text-green-600">All items are available.</p>
        ) : availability ? (
          <div className="mt-1 text-sm text-red-600">
            <p>{availability.message || 'Some items are unavailable.'}</p>
            {availability.availability?.filter(item => !item.available).map(item => (
              <p key={item.product}>{item.name}: {item.availableQuantity} available, {item.requestedQuantity} requested</p>
            ))}
          </div>
        ) : null}
      </div>

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
              className={`w-5 h-5 transform transition ${isDropdownOpen ? "rotate-180" : ""
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
          <span className="text-gray-600">Subtotal ({getCartCount()} items × {durationDays || 0} days)</span>
          <span className="font-medium">Rp.{subtotal.toLocaleString()}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>- Rp.{discountAmount.toLocaleString()}</span>
          </div>
        )}
        {depositAmount > 0 && (
          <div className="flex justify-between text-blue-700">
            <span>Refundable security deposit</span>
            <span>Rp.{depositAmount.toLocaleString()}</span>
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

      {/* Tombol */}
      {
        !isPlacedOrderClicked ? (
          <button
            onClick={() => setIsPlacedOrderClicked(true)}
            disabled={checkingAvailability || !availability?.available}
            className="w-full mt-5 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Place Order
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={createOrder}
              className="w-full mt-5 py-3 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Cash On Delivery
            </button>
            <button
              onClick={createOrderStripe}
              className="w-full flex justify-center items-center border border-indigo-500 bg-white hover:bg-gray-100 mt-5 py-3  "
            >
              <Image className="w-12" src={assets.stripe_logo} alt="" />
            </button>
          </div>
        )
      }
    </div>
  );
};

export default OrderSummary;
