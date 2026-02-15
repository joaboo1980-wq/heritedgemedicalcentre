import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verify the reset session from the URL hash
    const verifyResetSession = async () => {
      try {
        // Supabase sets the session automatically from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setError('Invalid or expired reset link. Please request a new password reset.');
          console.error('Session verification error:', error);
          return;
        }

        if (session) {
          setSessionVerified(true);
        } else {
          setError('No active session. Please use the link from your email.');
        }
      } catch (err) {
        console.error('Error verifying session:', err);
        setError('An error occurred while verifying your reset link.');
      }
    };

    verifyResetSession();
  }, []);

  const validatePassword = (pwd: string) => {
    // At least 8 characters
    return pwd.length >= 8;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sessionVerified) {
      setError('Session not verified. Please request a new password reset link.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        toast.error('Failed to reset password: ' + error.message);
      } else {
        setIsResetSuccess(true);
        toast.success('Password reset successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('An error occurred while resetting your password');
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionVerified && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground mt-4">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <CardTitle>Reset Password</CardTitle>
          </div>
          <CardDescription>
            {isResetSuccess
              ? 'Your password has been reset successfully'
              : 'Enter your new password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResetSuccess ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <Alert className="border-green-200 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                <AlertDescription>
                  Your password has been successfully reset. You will be redirected to the login page in a moment.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Password must be at least 8 characters long.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !password || !confirmPassword}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
