import type React from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Check, Loader2 } from "lucide-react"

interface StatusMessageProps {
    type: "success" | "error" | "loading"
    message: string
}

const StatusMessage: React.FC<StatusMessageProps> = ({ type, message }) => {
    return (
        <Alert
            className={`mb-4 ${
                type === "error"
                    ? "bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-800"
                    : type === "success"
                        ? "bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-800"
                        : "bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
            }`}
        >
            {type === "error" && <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />}
            {type === "success" && <Check className="h-4 w-4 text-green-500 dark:text-green-400" />}
            {type === "loading" && <Loader2 className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />}
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    )
}

export default StatusMessage