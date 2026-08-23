import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
