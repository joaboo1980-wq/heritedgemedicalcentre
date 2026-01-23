import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import heritageLogo from '@/assets/heritage-logo.jpg';
import healthcareHero from '@/assets/healthcare-hero.jpg';

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
      {/* Left Side - Branding with Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img 
          src={healthcareHero} 
          alt="Healthcare" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-primary/80" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <img 
                src={heritageLogo} 
                alt="Heritage Medical Center" 
                className="h-16 w-auto rounded-lg bg-white p-1"
              />
            </div>
            
            <h1 className="text-4xl font-bold mb-4">
              Hospital Management System
            </h1>
            <p className="text-lg text-primary-foreground/90 mb-8">
              Streamline your healthcare operations with our comprehensive management solution.
            </p>
            
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex-1">
                <h3 className="font-semibold mb-1">Secure</h3>
                <p className="text-sm text-primary-foreground/80">Role-based access control</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex-1">
                <h3 className="font-semibold mb-1">Compliant</h3>
                <p className="text-sm text-primary-foreground/80">Healthcare standards</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="lg:hidden flex justify-center mb-6">
            <img 
              src={heritageLogo} 
              alt="Heritage Medical Center" 
              className="h-20 w-auto"
            />
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">Staff Login</h2>
            <p className="text-muted-foreground mt-2">Enter your credentials to access the system</p>
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
              <Label htmlFor="password">Password</Label>
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
