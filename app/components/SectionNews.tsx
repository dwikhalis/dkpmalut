"use client";

import { useEffect, useState } from "react";
import Card from "./Card";
import { getNews } from "@/lib/supabase/supabaseHelper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import Button from "./Button";
import Reveal from "./Reveal";

interface NewsItem {
  id: string;
  image: string;
  tag: string;
  date: string;
  title: string;
  content: string;
}

export default function SectionNews() {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getNews();
        setNews(data);
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <section>
      {/* Desktop & Tablet */}
      <Reveal
        animation="fade-up"
        className="hidden md:block bg-gradient-to-r from-sky-700 to-sky-200 pt-12"
      >
        <div className="flex flex-col gap-6 py-12 mx-12 2xl:mx-24 justify-center items-center bg-sky-100 rounded-4xl shadow-2xl">
          <Reveal animation="fade-up" delay={80}>
            <h2 className="text-center">BERITA TERKINI</h2>
            <h5 className="text-center">
              Kanal Informasi Kelautan dan Perikanan Maluku Utara
            </h5>
          </Reveal>

          <div className="hidden md:hidden lg:flex flex-wrap gap-6 xl:gap-12 2xl:gap-24 justify-center 2xl:mx-24 mb-12">
            {loading ? (
              <p>Loading...</p>
            ) : (
              news?.slice(-3).map((item, index) => (
                <Reveal
                  key={item.id}
                  animation="fade-up"
                  delay={120 + index * 120}
                  className="home-hover-lift"
                >
                  <Card type="container" id={item.id} data={news || []} />
                </Reveal>
              ))
            )}
          </div>

          <div className="hidden md:flex lg:hidden flex-wrap gap-6 xl:gap-12 2xl:gap-24 justify-center 2xl:mx-24 mb-12">
            {loading ? (
              <p>Loading...</p>
            ) : (
              news?.slice(-3).map((item, index) => (
                <Reveal
                  key={item.id}
                  animation="fade-up"
                  delay={120 + index * 120}
                  className="home-hover-lift"
                >
                  <Card type="container-sm" id={item.id} data={news || []} />
                </Reveal>
              ))
            )}
          </div>

          <Reveal animation="fade-up" delay={420}>
            <Button size="xl" text="Lainnya" link="/berita" />
          </Reveal>
        </div>
      </Reveal>

      {/* Mobile */}
      <Reveal animation="fade-up" className="md:hidden block bg-sky-300 pb-10">
        <div className="flex flex-col gap-3 py-6 mx-6 2xl:mx-24 justify-center items-center bg-sky-100 rounded-4xl shadow-xl">
          <Reveal animation="fade-up" delay={80}>
            <h2 className="text-center">BERITA TERKINI</h2>
            <h5 className="text-center mx-12">
              Kanal Informasi Kelautan dan Perikanan Maluku Utara
            </h5>
          </Reveal>

          <div className="md:hidden flex w-full">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Swiper
                modules={[Pagination, Autoplay]}
                pagination={{ clickable: true }}
                autoplay={{ delay: 5000 }}
              >
                {news?.slice(-3).map((item) => (
                  <SwiperSlide key={item.id}>
                    <div className="flex justify-center items-center mb-14 mx-6">
                      <Card
                        type="container-mobile"
                        id={item.id}
                        data={news || []}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>

          <Reveal animation="fade-up" delay={220}>
            <Button size="mobile-xl" text="Lainnya" link="/berita" />
          </Reveal>
        </div>
      </Reveal>
    </section>
  );
}
