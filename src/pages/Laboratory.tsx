import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Laboratory = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Laboratory</h1>
        <p className="text-muted-foreground mt-1">
          Manage lab tests and results
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lab Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Laboratory management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Laboratory;