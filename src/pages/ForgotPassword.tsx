import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'sent'>('request');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes('User not found')) {
          toast.error('Email not found in the system');
        } else {
          toast.error(error.message);
        }
      } else {
        setStep('sent');
        toast.success('Password reset email sent');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => navigate('/auth')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            {step === 'request'
              ? 'Enter your email to receive a password reset link'
              : 'Check your email for the password reset link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure you enter the email address associated with your account.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Password reset link has been sent to your email address. Please check your email (including spam folder) for the reset link.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
