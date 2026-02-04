import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  gradient?: string;
  isLoading?: boolean;
}

const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'positive', 
  icon: Icon,
  iconColor = 'text-white',
  gradient = 'bg-gradient-to-br from-blue-500 to-cyan-500',
  isLoading = false
}: StatsCardProps) => {
  if (isLoading) {
    return (
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden shadow-lg border-0", gradient)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/80">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {change && (
              <p className={cn(
                "text-sm mt-2 font-medium",
                changeType === 'positive' ? 'text-green-100' : 
                changeType === 'negative' ? 'text-red-100' : 'text-white/70'
              )}>
                {change}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg bg-white/20 backdrop-blur-sm", iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
