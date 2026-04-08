
import { useState } from "react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image"

const ProductShowcase = () => {
  const [active, setActive] = useState(0);

  const products = [
    {
      id: 1,
      name: "Radiance Serum",
      description: "Brightening vitamin C serum for glowing skin",
      price: "$49",
      rating: 4.9,
      reviewCount: 124,
      badge: "Best Seller",
      image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1974"
    },
    {
      id: 2,
      name: "Hydra Cream",
      description: "Deep moisturizing cream for all skin types",
      price: "$38",
      rating: 4.8,
      reviewCount: 98,
      badge: "New",
      image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=2080"
    },
    {
      id: 3,
      name: "Velvet Lipstick",
      description: "Long-lasting matte finish in stunning shades",
      price: "$24",
      rating: 4.7,
      reviewCount: 156,
      badge: "Trending",
      image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=2015"
    },
  ];

  const nextProduct = () => {
    setActive((prev) => (prev === products.length - 1 ? 0 : prev + 1));
  };

  const prevProduct = () => {
    setActive((prev) => (prev === 0 ? products.length - 1 : prev - 1));
  };

  return (
    <section id="products" className="py-16 md:py-24 overflow-hidden">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="subtitle">Featured Products</span>
          <h2 className="title">Discover Our Bestsellers</h2>
          <p className="description mx-auto">
            Our most loved products, curated for exceptional results.
            Experience beauty that delivers on its promise.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center justify-between absolute top-1/2 -translate-y-1/2 left-4 right-4 z-10">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-xs"
              onClick={prevProduct}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-xs"
              onClick={nextProduct}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center justify-center">
            {products.map((product, index) => (
              <div
                key={product.id}
                className={`transition-all duration-500 ease-out ${index === active
                  ? "relative opacity-100 scale-100 z-10"
                  : "absolute opacity-0 scale-95 z-0"
                  }`}
              >
                {index === active && (
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="aspect-square rounded-xl overflow-hidden">
                      <Image
                        fill
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-all duration-500 hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col items-start p-6">
                      <Badge variant="secondary" className="mb-4">
                        {product.badge}
                      </Badge>
                      <h3 className="font-display text-3xl md:text-4xl font-medium mb-2">
                        {product.name}
                      </h3>
                      <p className="text-xl font-medium text-accent mb-4">
                        {product.price}
                      </p>
                      <p className="text-muted-foreground mb-6">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-2 mb-8">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < Math.floor(product.rating)
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {product.rating} ({product.reviewCount} reviews)
                        </span>
                      </div>
                      <Button>Add to Cart</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-8 gap-2">
            {products.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${index === active
                  ? "bg-accent w-8"
                  : "bg-muted"
                  }`}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
