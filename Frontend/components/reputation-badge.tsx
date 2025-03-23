import { Badge } from "@/components/ui/badge"

interface ReputationBadgeProps {
  reputation: number
  size?: "sm" | "lg"
}

export default function ReputationBadge({ reputation, size = "sm" }: ReputationBadgeProps) {
  const getBadgeColor = (rep: number) => {
    if (rep >= 100) return "bg-purple-500"
    if (rep >= 50) return "bg-blue-500"
    if (rep >= 10) return "bg-green-500"
    return "bg-gray-500"
  }

  const getBadgeTitle = (rep: number) => {
    if (rep >= 100) return "Master"
    if (rep >= 50) return "Expert"
    if (rep >= 10) return "Contributor"
    return "Novice"
  }

  return (
    <Badge className={`${getBadgeColor(reputation)} ${size === "lg" ? "text-base px-4 py-1" : ""}`}>
      {getBadgeTitle(reputation)} ({reputation})
    </Badge>
  )
} 