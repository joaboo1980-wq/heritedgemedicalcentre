import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Appointments = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Appointments</h1>
        <p className="text-muted-foreground mt-1">
          Schedule and manage patient appointments
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Appointment Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Appointment management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Appointments;