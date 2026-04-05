import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Check, X } from 'lucide-react';
import { validatePassword, isPasswordValid } from '@/utils/passwordValidator';

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
    // Listen for auth state changes to detect when session is set from URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[ResetPassword] Auth event:', event, 'Session:', !!session);
        
        if (event === 'PASSWORD_RECOVERY') {
          // Password recovery event indicates we have a valid reset session
          if (session) {
            console.log('[ResetPassword] Password recovery session detected');
            setSessionVerified(true);
            setError(null);
          } else {
            setError('No active session. Please use the link from your email.');
          }
        } else if (event === 'SIGNED_IN') {
          // Also handle SIGNED_IN event in case that's what Supabase triggers
          if (session) {
            console.log('[ResetPassword] Signed in session detected');
            setSessionVerified(true);
            setError(null);
          }
        }
      }
    );

    // Also check for existing session immediately
    const checkExistingSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[ResetPassword] Session check error:', error);
          setError('Invalid or expired reset link. Please request a new password reset.');
          return;
        }

        if (session && session.user?.email) {
          console.log('[ResetPassword] Found existing session for:', session.user.email);
          setSessionVerified(true);
          setError(null);
        } else {
          console.log('[ResetPassword] No session found yet, waiting for auth state change...');
        }
      } catch (err) {
        console.error('[ResetPassword] Error checking session:', err);
        setError('An error occurred while verifying your reset link.');
      }
    };

    checkExistingSession();

    return () => subscription.unsubscribe();
  }, []);

  const passwordRequirements = validatePassword(password);
  const passwordValid = isPasswordValid(password);

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

    if (!passwordValid) {
      setError('Password does not meet all requirements');
      return;
    }

    setIsLoading(true);

    try {
      // Get the latest session to ensure it's still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[ResetPassword] Session error:', sessionError);
        setError('Session expired. Please request a new password reset link.');
        setSessionVerified(false);
        setIsLoading(false);
        return;
      }

      console.log('[ResetPassword] Attempting password update with valid session');
      
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('[ResetPassword] Password update error:', error);
        
        // Handle specific error cases
        if (error.message.includes('session') || error.message.includes('Session')) {
          setError('Session expired. Please request a new password reset link.');
          setSessionVerified(false);
        } else {
          setError(error.message);
        }
        
        toast.error('Failed to reset password: ' + error.message);
      } else {
        console.log('[ResetPassword] Password reset successful');
        setIsResetSuccess(true);
        toast.success('Password reset successfully!');
        
        // Sign out and redirect to login after 3 seconds
        await supabase.auth.signOut();
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (err) {
      console.error('[ResetPassword] Error resetting password:', err);
      setError('An error occurred while resetting your password');
      toast.error('Failed to reset password: Auth session missing!');
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
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className={password && !passwordValid ? 'border-amber-500 focus:border-amber-500 focus:ring-amber-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Password Requirements Checklist */}
                {password && (
                  <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700">Password Requirements:</p>
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 text-sm ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordRequirements.minLength ? (
                          <Check className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordRequirements.hasUppercase ? (
                          <Check className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordRequirements.hasNumber ? (
                          <Check className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span>One number (0-9)</span>
                      </div>
                    </div>
                  </div>
                )}
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

              <Alert className={passwordValid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
                <AlertCircle className={`h-4 w-4 ${passwordValid ? 'text-green-600' : 'text-amber-600'}`} />
                <AlertDescription className={passwordValid ? 'text-green-800' : 'text-amber-800'}>
                  {passwordValid 
                    ? 'Password meets all security requirements' 
                    : 'Password does not meet security requirements. See checklist above.'}
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !password || !confirmPassword || !passwordValid || password !== confirmPassword}
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
