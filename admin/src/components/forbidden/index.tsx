import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Forbidden() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <div className="text-9xl font-bold">403</div>
                <h1 className="text-4xl font-semibold">Access Denied</h1>
                <p className="text-lg">You do not have permission to access this page.</p>
                <Button variant="outline" className="mt-4 text-white hover:bg-white hover:text-gray-900 border-white">
                    <Link href="/">Go Home</Link>
                </Button>
            </div>
        </div>
    )
}