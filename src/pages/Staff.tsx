import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Staff = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Staff</h1>
        <p className="text-muted-foreground mt-1">
          Manage hospital staff and roles
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Staff management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Staff;