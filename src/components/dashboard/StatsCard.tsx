import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: LucideIcon;
  iconColor?: string;
}

const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'positive', 
  icon: Icon,
  iconColor = 'text-primary'
}: StatsCardProps) => {
  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {change && (
              <p className={cn(
                "text-sm mt-2 font-medium",
                changeType === 'positive' ? 'text-green-500' : 'text-red-500'
              )}>
                {change}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg bg-muted", iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;