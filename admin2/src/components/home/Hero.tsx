
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const Hero = () => {
  return <section className="relative pt-32 pb-16 md:pt-44 md:pb-24 overflow-hidden bg-background">
    <div className="container">
      <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
        <div className="animate-fade-in-down">
          <Image
            src="/text.png"
            alt="Shea - Beauty App"
            width={400}
            height={120}
            className="mx-auto mb-6"
          /> <p className="description mx-auto mb-8 text-muted-foreground">
            Your personal beauty assistant in your pocket. Discover products, get personalized recommendations, and manage your beauty routine with ease.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
          <Button size="lg" className="group">
            Download Now
            <Download className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </div>

      <div className="relative mx-auto max-w-md animate-scale-in">
        <div className="flex justify-center">
          <div className="relative w-[280px] h-[560px]">
            <div className="absolute inset-0 rounded-[30px] border-4 border-foreground/20 bg-card shadow-lg"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                width={280}
                height={560}
                src="/logo.png" alt="Shea App interface" className="w-full h-full object-cover rounded-[26px] p-2" loading="lazy" />
            </div>
          </div>
        </div>

        <div className="absolute -bottom-6 -right-6 md:-right-10 bg-card border border-border p-3 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(star => <svg key={star} className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>)}
            </div>
            <span className="text-sm text-dark font-medium">4.9/5</span>
          </div>
        </div>
      </div>
    </div>
  </section>;
};
export default Hero;
