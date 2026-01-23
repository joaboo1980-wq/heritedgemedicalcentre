import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Patients = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Patients</h1>
        <p className="text-muted-foreground mt-1">
          Manage patient records and information
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Patient Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Patient management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Patients;