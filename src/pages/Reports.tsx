import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Reports</h1>
        <p className="text-muted-foreground mt-1">
          View analytics and generate reports
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Reports and analytics features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;