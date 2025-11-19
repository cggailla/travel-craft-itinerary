import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, Clock } from "lucide-react";
import type { Trip } from "@/services/tripService";

interface DashboardStatsProps {
  trips: Trip[];
}

export function DashboardStats({ trips }: DashboardStatsProps) {
  const totalTrips = trips.length;
  const validatedTrips = trips.filter(t => t.status === 'validated').length;
  const draftTrips = trips.filter(t => t.status === 'draft').length;

  const stats = [
    {
      label: 'Total voyages',
      value: totalTrips,
      icon: FileText,
      color: 'text-primary',
    },
    {
      label: 'Voyages validés',
      value: validatedTrips,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      label: 'Brouillons',
      value: draftTrips,
      icon: Clock,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
