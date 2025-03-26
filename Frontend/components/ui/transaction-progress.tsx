import { Check, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TransactionProgressProps {
  stage: "submitted" | "pending" | "confirmed" | "error"
  errorMessage?: string
}

export function TransactionProgress({ stage, errorMessage }: TransactionProgressProps) {
  if (stage === "error") {
    return (
      <div className="fixed top-4 right-4 z-50 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-200 dark:border-red-800 p-4 transition-all duration-300 transform animate-in fade-in slide-in-from-right">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Transaction Failed</h3>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 transition-all duration-300 transform animate-in fade-in slide-in-from-right">
      <div className="relative">
        {/* Stage 1: Transaction Submitted */}
        <div className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
              stage === "submitted"
                ? "border-primary bg-primary/10 text-primary"
                : stage === "pending" || stage === "confirmed"
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 dark:border-gray-600",
            )}
          >
            {stage === "submitted" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : stage === "pending" || stage === "confirmed" ? (
              <Check className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium dark:text-gray-200">Transaction Submitted</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Waiting for confirmation</p>
          </div>
        </div>

        {/* Vertical Line 1 */}
        <div
          className={cn(
            "absolute left-4 top-8 w-0.5 h-8 transition-all duration-500",
            stage === "pending" || stage === "confirmed" ? "bg-primary" : "bg-gray-200 dark:bg-gray-600",
          )}
        />

        {/* Stage 2: Transaction Pending */}
        <div className="flex items-center mt-8">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
              stage === "pending"
                ? "border-primary bg-primary/10 text-primary"
                : stage === "confirmed"
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 dark:border-gray-600",
            )}
          >
            {stage === "pending" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : stage === "confirmed" ? (
              <Check className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium dark:text-gray-200">Transaction Pending</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Confirming on blockchain</p>
          </div>
        </div>

        {/* Vertical Line 2 */}
        <div
          className={cn(
            "absolute left-4 top-24 w-0.5 h-8 transition-all duration-500",
            stage === "confirmed" ? "bg-primary" : "bg-gray-200 dark:bg-gray-600",
          )}
        />

        {/* Stage 3: Transaction Confirmed */}
        <div className="flex items-center mt-8">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
              stage === "confirmed"
                ? "border-green-500 bg-green-500 text-white"
                : "border-gray-300 dark:border-gray-600",
            )}
          >
            {stage === "confirmed" ? (
              <Check className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium dark:text-gray-200">Transaction Confirmed</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Transaction completed successfully</p>
          </div>
        </div>
      </div>
    </div>
  )
}

