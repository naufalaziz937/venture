"use client";
import { useState } from "react";

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const faqs = [
        {
            question: 'Apa itu Venture?',
            answer:
                'Venture adalah platform online yang menyediakan layanan penyewaan perlengkapan hiking berkualitas tinggi untuk para pecinta alam.',
        },
        {
            question: 'Bagaimana cara menyewa perlengkapan hiking?',
            answer:
                'Anda dapat menjelajahi katalog kami, memilih perlengkapan yang dibutuhkan, menentukan durasi sewa, dan menyelesaikan pemesanan secara online.',
        },
        {
            question: 'Jenis perlengkapan apa saja yang tersedia?',
            answer:
                'Kami menyediakan tenda, ransel, sleeping bag, peralatan memasak, trekking pole, dan lainnya.',
        },
        {
            question: 'Apakah Venture menyediakan layanan antar-jemput?',
            answer:
                'Ya, kami menyediakan layanan pengantaran dan pengambilan perlengkapan untuk kenyamanan Anda. Biaya tambahan mungkin berlaku.',
        },
        {
            question: 'Apa yang terjadi jika saya merusak atau kehilangan perlengkapan?',
            answer:
                'Penyewa bertanggung jawab atas kerusakan atau kehilangan perlengkapan. Biaya tambahan akan dikenakan sesuai dengan tingkat kerusakan.',
        },
        {
            question: 'Bisakah saya memperpanjang masa sewa?',
            answer:
                'Ya, Anda dapat memperpanjang masa sewa dengan menghubungi tim dukungan kami sebelum masa sewa berakhir.',
        },
        {
            question: 'Apakah Venture menyediakan tur hiking dengan pemandu?',
            answer:
                'Saat ini, kami tidak menyediakan tur dengan pemandu, tetapi kami dapat merekomendasikan pemandu lokal yang terpercaya.',
        },
        {
            question: 'Apakah perlengkapan yang disewakan sudah dibersihkan?',
            answer:
                'Ya, semua perlengkapan kami dibersihkan dan disterilkan dengan baik setelah setiap penggunaan untuk memastikan kebersihan dan keamanan.',
        }
    ];

    return (
        <>
            <section className="bg-white text-zinc-900 py-8 sm:py-16 mt-28 mb-28">
                <div className="max-w-4xl mx-auto px-6 lg:px-16">
                    <div className="mb-8">
                        <h2 className="text-4xl text-center font-bold">Pertanyaan yang Sering Diajukan</h2>
                    </div>
                    <div className="grid grid-cols-1">
                        {faqs.map((faq, index) => (
                            <div key={index}>
                                <div
                                    className="flex items-center border-b border-zinc-200 cursor-pointer"
                                    onClick={() => toggleFAQ(index)}
                                >
                                    <h3 className="text-xl py-4 font-medium text-zinc-800 flex-1 min-w-0">
                                        {faq.question}
                                    </h3>
                                    <div
                                        className={`w-6 h-6 transition-transform ${openIndex === index ? 'rotate-90' : ''}`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="#27272a"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                            <path d="M9 6l6 6l-6 6"></path>
                                        </svg>
                                    </div>
                                </div>
                                {openIndex === index && (
                                    <p className="text-base text-zinc-500 py-6 border-b border-zinc-200">
                                        {faq.answer}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
