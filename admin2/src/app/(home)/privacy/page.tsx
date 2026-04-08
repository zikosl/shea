import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-background pt-32 text-foreground px-6 md:px-16 py-12">
            <ScrollArea className="h-full">
                <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    Effective date: July 3, 2025
                </p>

                <Separator className="mb-6" />

                <div className="space-y-10 text-base leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-semibold mb-2">1. Introduction</h2>
                        <p>
                            Welcome to Shea, a personalized app built for women. Your privacy
                            is important to us. This Privacy Policy explains how we handle
                            your personal data when you use the Shea app or website.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">2. Information We Collect</h2>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>Account Info:</strong> Name, email, profile photo.</li>
                            <li><strong>Device Info:</strong> IP, OS, device type.</li>
                            <li><strong>App Usage:</strong> Pages viewed, actions taken.</li>
                            <li><strong>Location:</strong> Only with your explicit consent.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">3. How We Use Your Data</h2>
                        <p>We use your information to:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Provide Shea’s features and improve the app</li>
                            <li>Send important updates or offers</li>
                            <li>Monitor and analyze user behavior</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">4. Cookies and Tracking</h2>
                        <p>
                            We use cookies and similar tools for analytics and functionality.
                            You can manage or disable them in your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">5. Sharing Your Data</h2>
                        <p>
                            We never sell your data. We may share your information with trusted
                            third parties (e.g., analytics providers) only to help improve our
                            service and always under strict privacy agreements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">6. Data Security</h2>
                        <p>
                            We use industry-standard security to protect your data, but no system
                            is ever completely secure. Please use Shea responsibly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">7. Your Rights</h2>
                        <p>
                            You can access, correct, or delete your personal data at any time by
                            contacting us.
                        </p>
                        <p className="mt-2">
                            Email: <a href="mailto:support@shea.app" className="text-primary underline">support@shea.app</a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">8. Children’s Privacy</h2>
                        <p>
                            Shea is not intended for children under 13. We do not knowingly
                            collect data from minors. If you believe a child has provided us
                            information, please contact us.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">9. Policy Updates</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We encourage
                            you to review it regularly. Changes are effective upon posting.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-2">10. Contact Us</h2>
                        <p>
                            For any questions or privacy concerns, contact us at:
                            <br />
                            <a href="mailto:support@shea.app" className="text-primary underline">support@shea.app</a>
                        </p>
                    </section>
                </div>
            </ScrollArea>
        </main>
    );
}
