import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import heritageLogo from '@/assets/heritage-logo.jpg';
import loginPageImage from '@/assets/Loginpage.png';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please confirm your email before signing in');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT HALF - Login Page Image */}
      <div className="hidden lg:flex w-1/2 bg-gray-900">
        <img 
          src={loginPageImage} 
          alt="Healthcare" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* RIGHT HALF - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 bg-gradient-to-br from-background to-background/95">
        {/* Logo - Above Form */}
        <div className="flex justify-center mb-8">
          <img 
            src={heritageLogo} 
            alt="Heritage Medical Center" 
            className="h-24 w-auto rounded-lg bg-white p-2 shadow-lg"
          />
        </div>
        
        {/* Form Card */}
        <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Staff Login</h2>
            <p className="text-muted-foreground mt-2">Hospital Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 border-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary hover:underline"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot Password?
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
