
"use client"
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star } from "lucide-react";
import Image from "next/image"
const testimonials = [
  {
    id: "skincare",
    label: "Skincare",
    items: [
      {
        id: 1,
        name: "Emma Johnson",
        text: "The app completely transformed my skincare routine. The personalized recommendations were spot-on for my combination skin, and I've seen real improvements in just weeks!",
        rating: 5,
        image: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=1974"
      },
      {
        id: 2,
        name: "Michael Chen",
        text: "I appreciate how the app helps me track my skincare products and reminds me when it's time to reorder. The ingredient analysis feature has helped me avoid irritants.",
        rating: 4,
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070"
      },
      {
        id: 3,
        name: "Sophia Rodriguez",
        text: "As someone with sensitive skin, I love how this app helps me find gentle, effective products. The expert chat feature saved me when I had a reaction to a new product.",
        rating: 5,
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961"
      }
    ]
  },
  {
    id: "makeup",
    label: "Makeup",
    items: [
      {
        id: 4,
        name: "Aisha Patel",
        text: "Finding the right foundation shade has always been difficult for me until I used this app. The virtual try-on is incredibly accurate, and I've discovered products I now can't live without!",
        rating: 5,
        image: "https://images.unsplash.com/photo-1569913486515-b74bf7751574?q=80&w=2070"
      },
      {
        id: 5,
        name: "Jackson Kim",
        text: "I buy makeup for my partner and this app makes it so easy. The recommendations are always on point, and the delivery is always fast. Couldn't be happier!",
        rating: 4,
        image: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=1974"
      },
      {
        id: 6,
        name: "Olivia Martinez",
        text: "The makeup tutorials within the app completely changed my application techniques. I've learned so much, and now my makeup lasts all day. Worth every penny!",
        rating: 5,
        image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=2071"
      }
    ]
  },
  {
    id: "fragrance",
    label: "Fragrance",
    items: [
      {
        id: 7,
        name: "David Thompson",
        text: "Finding a signature scent is so much easier with this app. The fragrance quiz recommended perfumes that perfectly match my preferences and personality.",
        rating: 4,
        image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=2048"
      },
      {
        id: 8,
        name: "Lily Wang",
        text: "I love the detailed descriptions of fragrance notes and how the app suggests scents based on my mood and the season. It's like having a personal perfumer!",
        rating: 5,
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964"
      },
      {
        id: 9,
        name: "Marcus Johnson",
        text: "The subscription service for fragrance samples is genius. I've discovered so many amazing scents I would never have tried otherwise. Highly recommended!",
        rating: 5,
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974"
      }
    ]
  }
];

const Testimonials = () => {
  const [activeTab, setActiveTab] = useState("skincare");

  return (
    <section id="testimonials" className="py-16 md:py-24">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="subtitle">Testimonials</span>
          <h2 className="title">What Our Users Say</h2>
          <p className="description mx-auto">
            Discover why thousands of beauty enthusiasts trust our app for their cosmetic needs.
            Read real experiences from our community.
          </p>
        </div>

        <Tabs defaultValue="skincare" value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            {testimonials.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="text-sm md:text-base">
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {testimonials.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <div className="grid md:grid-cols-3 gap-6">
                {category.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-background p-6 rounded-xl border border-border flex flex-col"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      animationFillMode: 'both'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < item.rating
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground grow mb-4 italic">&quot;{item.text}&quot;</p>
                    <div className="flex items-center gap-3 mt-auto">
                      <div className="size-10 rounded-full overflow-hidden">
                        <Image
                          fill
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default Testimonials;
