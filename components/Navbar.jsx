"use client";
import React, { useState } from "react";
import {
  assets,
  BagIcon,
  BoxIcon,
  CartIcon,
  HomeIcon,
} from "@/assets/assets";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import { useClerk, UserButton } from "@clerk/nextjs";
import { useVerification, VerificationBadge } from '@/components/VerificationStatus';

const Navbar = () => {
  const { verification } = useVerification();
  const { isSeller, router, user } = useAppContext();
  const { openSignIn } = useClerk();
  const [searchInput, setSearchInput] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/all-products?q=${encodeURIComponent(searchInput.trim())}`);
      setSearchInput("");
    }
  };

  return (
    <>
      <nav className="flex items-center justify-between px-6 md:px-16 lg:px-32 py-3 border-b border-gray-300 text-gray-700">
        {/* Logo */}
        <Image
          className="cursor-pointer w-28 md:w-32"
          onClick={() => router.push("/")}
          src={assets.logo}
          alt="logo"
        />

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-4 lg:gap-8">
          <Link href="/" className="hover:text-gray-900 transition">
            Home
          </Link>
          <Link href="/all-products" className="hover:text-gray-900 transition">
            Rent
          </Link>
          <Link href="/about" className="hover:text-gray-900 transition">
            About Us
          </Link>
          <Link href="/faq" className="hover:text-gray-900 transition">
            FAQ
          </Link>
          <Link href="/contact" className="hover:text-gray-900 transition">
            Contact
          </Link>
          {isSeller && (
            <button
              onClick={() => router.push("/seller")}
              className="text-xs border px-4 py-1.5 rounded-full"
            >
              Admin Dashboard
            </button>
          )}
        </div>

        {/* Desktop Right Side */}
        <ul className="hidden lg:flex items-center gap-4">
          {/* Search Bar (Desktop only) */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              name="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              className="border rounded-full px-4 py-1 text-sm"
            />
            <button type="submit" className="absolute right-2 top-1.5">
              <Image
                className="w-4 h-4"
                src={assets.search_icon}
                alt="search icon"
              />
            </button>
          </form>

          {/* Account */}
          {user ? (
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Action label="Identity Verification" labelIcon={<VerificationBadge status={verification?.status} />} onClick={() => router.push("/account/verification")} />
                <UserButton.Action
                  label="Cart"
                  labelIcon={<CartIcon />}
                  onClick={() => router.push("/cart")}
                />
                <UserButton.Action
                  label="My Orders"
                  labelIcon={<BagIcon />}
                  onClick={() => router.push("/my-orders")}
                />
              </UserButton.MenuItems>
            </UserButton>
          ) : (
            <button
              onClick={openSignIn}
              className="flex items-center gap-2 hover:text-gray-900 transition"
            >
              <Image src={assets.user_icon} alt="user icon" />
              Account
            </button>
          )}
        </ul>

        {/* Mobile Menu */}
        <div className="flex items-center lg:hidden gap-3">
          {isSeller && (
            <button
              onClick={() => router.push("/seller")}
              className="text-xs border px-4 py-1.5 rounded-full"
            >
              Seller Dashboard
            </button>
          )}
          {user ? (
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Action label="Identity Verification" labelIcon={<VerificationBadge status={verification?.status} />} onClick={() => router.push("/account/verification")} />
                <UserButton.Action
                  label="Home"
                  labelIcon={<HomeIcon />}
                  onClick={() => router.push("/")}
                />
                <UserButton.Action
                  label="Product"
                  labelIcon={<BoxIcon />}
                  onClick={() => router.push("/all-products")}
                />
                <UserButton.Action
                  label="Cart"
                  labelIcon={<CartIcon />}
                  onClick={() => router.push("/cart")}
                />
                <UserButton.Action
                  label="My Orders"
                  labelIcon={<BagIcon />}
                  onClick={() => router.push("/my-orders")}
                />
              </UserButton.MenuItems>
            </UserButton>
          ) : (
            <button
              onClick={openSignIn}
              className="flex items-center gap-2 hover:text-gray-900 transition"
            >
              <Image src={assets.user_icon} alt="user icon" />
              Account
            </button>
          )}
        </div>
      </nav>

      {/* Search Bar (Mobile only) */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex lg:hidden px-6 py-2 border-b border-gray-300"
      >
        <input
          type="text"
          name="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search..."
          className="w-full border rounded-full px-4 py-1 text-sm"
        />
        <button type="submit" className="-ml-10 mt-1.5">
          <Image
            className="w-4 h-4"
            src={assets.search_icon}
            alt="search icon"
          />
        </button>
      </form>
    </>
  );
};

export default Navbar;
