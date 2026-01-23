import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Pharmacy = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Pharmacy</h1>
        <p className="text-muted-foreground mt-1">
          Manage medications and prescriptions
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Pharmacy management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pharmacy;