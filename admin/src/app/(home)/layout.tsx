import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import styles from "@/components/home/landing-system.module.css";

export const metadata: Metadata = {
    title: "Shea | Beauty Commerce OS",
    description: "One connected platform for beauty catalog, partner, order, delivery, and customer operations."
};

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function Home({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.landing}>
            <Navbar />
            <main>
                {children}
            </main>
            <Footer />
        </div>
    );
}
