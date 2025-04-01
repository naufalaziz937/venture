import React from "react";

const Contact = () => {
    return (
        <>
            <div className="bg-gray-100 py-12">
                <div className="max-w-screen-xl mx-auto px-6 grid md:grid-cols-2 gap-12">
                    {/* Informasi Kontak */}
                    <div className="bg-white shadow-lg rounded-lg p-6">
                        <div className="mb-6">
                            <i className="fas fa-map-marker-alt text-green-500 text-xl"></i>
                            <p className="mt-2 text-gray-700">Jln. Kolonel Rusdi no.69</p>
                        </div>
                        <div className="mb-6">
                            <i className="fas fa-envelope text-green-500 text-xl"></i>
                            <p className="mt-2 text-gray-700">venturerent@bussines.com</p>
                            <p className="mt-2 text-gray-700">help.venturerent@bussines.com</p>
                        </div>
                        <div>
                            <i className="fas fa-phone text-green-500 text-xl"></i>
                            <p className="mt-2 text-gray-700">+62-834-567-890</p>
                            <p className="text-gray-500">123 456</p>
                        </div>
                    </div>

                    {/* Formulir Kontak */}
                    <div className="bg-white shadow-lg rounded-lg p-6">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Venture</h2>
                        <p className="text-gray-500 mb-6">Feel free to contact we.</p>
                        <form>
                            <input type="text" placeholder="Your Name" className="w-full border rounded-lg px-4 py-2 mb-4 focus:outline-none" />
                            <input type="email" placeholder="Your Email" className="w-full border rounded-lg px-4 py-2 mb-4 focus:outline-none" />
                            <textarea placeholder="Message" className="w-full border rounded-lg px-4 py-2 mb-4 focus:outline-none"></textarea>
                            <button className="bg-green-500 text-white px-6 py-2 rounded-lg">Send Message</button>
                        </form>
                    </div>
                </div>

                {/* Peta */}
                <div className="mt-12">
                    <iframe 
                    className="w-full h-64"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d495.22047601934617!2d107.53244532901493!3d-6.798564764147376!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68e3f2eb3b2ef7%3A0x80df3e406db1a391!2sWarung%20Abra!5e0!3m2!1sid!2sid!4v1738482264448!5m2!1sid!2sid"
                        loading="lazy"
                    ></iframe>
                </div>
            </div>
        </>
    );
};

export default Contact;