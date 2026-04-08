import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound() {
    return (
        <div className="h-full flex-1 flex items-center justify-center bg-transparent text-gray-900 dark:text-gray-50">
            <div className="text-center">
                <div className="text-9xl font-bold">404</div>
                <h1 className="text-4xl font-semibold">Content Not Found</h1>
                <p className="text-lg">Nothing is here go back to the home page.</p>
                <Button variant="outline" className="mt-4 dark:text-gray-50 text-gray-900 dark:hover:bg-gray-50 hover:bg-gray-900 dark:hover:text-gray-900 hover:text-gray-50 dark:border-gray-50 border-gray-900">
                    <Link href="/">Go Home</Link>
                </Button>
            </div>
        </div>
    )
}