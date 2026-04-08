import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

export default async function Home({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main>
                {
                    children
                }
            </main>
            <Footer />
        </div>
    );
}
