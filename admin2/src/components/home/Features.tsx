
import { Smartphone, Search, Heart, ShoppingBag, MessageSquare, Settings } from "lucide-react";

const features = [
  {
    id: 1,
    icon: <Search className="h-6 w-6" />,
    title: "Smart Search",
    description: "Find products tailored to your skin type, concerns, and preferences with our intelligent search algorithm."
  },
  {
    id: 2,
    icon: <Heart className="h-6 w-6" />,
    title: "Personalized Recommendations",
    description: "Receive custom product suggestions based on your beauty profile and previous purchases."
  },
  {
    id: 3,
    icon: <ShoppingBag className="h-6 w-6" />,
    title: "Virtual Try-On",
    description: "Test products virtually before you buy with our AR-powered try-on feature."
  },
  {
    id: 4,
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Beauty Expert Chat",
    description: "Get advice from licensed beauty professionals for your skincare and makeup questions."
  },
  {
    id: 5,
    icon: <Smartphone className="h-6 w-6" />,
    title: "Routine Tracking",
    description: "Track your beauty routine and receive reminders to keep your skincare regimen consistent."
  },
  {
    id: 6,
    icon: <Settings className="h-6 w-6" />,
    title: "Ingredient Analysis",
    description: "Understand what's in your products with our detailed ingredient scanner and analysis."
  }
];

const Features = () => {
  return (
    <section id="features" className="py-16 md:py-24 bg-secondary/50">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="subtitle">App Features</span>
          <h2 className="title">Everything You Need in One App</h2>
          <p className="description mx-auto">
            Our app combines cutting-edge technology with beauty expertise to create
            the ultimate shopping experience for all your cosmetic needs.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className="bg-background p-6 rounded-xl border border-border transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              style={{ 
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              <div className="size-12 flex items-center justify-center bg-accent/10 text-accent rounded-lg mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
