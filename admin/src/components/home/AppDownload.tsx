
import { Apple, Smartphone, Download, Zap, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const AppDownload = () => {
  return (
    <section id="download" className="py-24  bg-secondary/50">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="subtitle text-primary">Mobile App</span>
            <h2 className="title text-primay">Experience Shea</h2>
            <p className="description mx-auto text-[#8E9196]">
              Download our app and transform your beauty routine with personalized recommendations,
              routine tracking, and exclusive offers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 items-center gap-8">
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-scondary p-2 rounded-full">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1 text-primary">Fast & Intuitive</h3>
                    <p className="text-accent text-sm">
                      Navigate effortlessly with our clean, simple interface designed for speed.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-secondary p-2 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1 text-primary">Personalized For You</h3>
                    <p className="text-accent text-sm">
                      Get recommendations tailored to your skin type, preferences, and beauty goals.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-secondary p-2 rounded-full">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1 text-primary">Routine Reminders</h3>
                    <p className="text-accent text-sm">
                      Never miss a step with gentle reminders for your morning and evening routines.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="group bg-primary hover:bg-[#333333]">
                  <Apple className="mr-2 h-5 w-5" />
                  App Store
                </Button>
                <Button size="lg" variant="outline" className="border-[#8E9196] text-[#8E9196]">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Google Play
                </Button>
              </div>
            </div>

            <div className="relative h-full flex items-center justify-center p-8">
              <div className="animate-float">
                <div className="relative w-[240px] h-[480px]">
                  <div className="absolute inset-0 rounded-[30px] border-4 border-primary/20 bg-white shadow-lg"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image
                      width={240}
                      height={480}
                      src="/screenshoot.png"
                      alt="App screenshot"
                      className="w-full h-full object-cover rounded-[26px] p-2"
                    />
                  </div>
                </div>

                <div className="absolute -bottom-6 -right-6 bg-secondary/50 border border-[#C8C8C9] p-3 rounded-lg shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm text-dark font-medium">4.9/5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppDownload;
