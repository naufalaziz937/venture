import React from "react";

export function AboutUs() {
    return (
        <section>
            {/* Container */}
            <div className="mx-auto w-full max-w-7xl px-5 py-16 md:px-10 md:py-20 border-gray-100 border-b-2">
                {/* Title */}
                <h2 className="mb-8 text-3xl font-bold md:text-5xl md:mb-10 text-center">
                    Meet VentureHike
                </h2>
                <p className="mb-8 max-w-lg text-sm text-gray-500 sm:text-base md:mb-16 text-center mx-auto">
                    VentureHike is a web-based rental platform for hiking gear, founded in February 2025. This innovative venture was created by Nazwan, an 11th-grade vocational high school student, with the goal of making outdoor adventures more accessible and enjoyable for everyone.
                </p>
                <div className="grid gap-8 md:grid-cols-2 md:gap-10">
                    <img src="https://i.pinimg.com/474x/60/82/a5/6082a59be19c6733b1ca9f8d34fe5df5.jpg" alt="" className="inline-block h-full w-full rounded-2xl object-cover" />
                    <div className="flex flex-col gap-5 rounded-2xl border border-solid border-black p-10 sm:p-12">
                        <h2 className="text-3xl font-bold md:text-5xl">Our Mission</h2>
                        <p className="text-sm text-gray-500 sm:text-base">
                            At VentureHike, we aim to provide high-quality and affordable hiking equipment to outdoor enthusiasts. Whether you're a beginner or an experienced trekker, our platform makes renting gear simple and convenient. 
                            <br />
                            <br />
                            Our mission is to inspire people to explore nature without barriers, ensuring that everyone has access to the best equipment for their adventures. We are committed to sustainability, affordability, and enhancing the outdoor experience for all.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
