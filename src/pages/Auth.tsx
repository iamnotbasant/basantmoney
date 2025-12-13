import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, TrendingUp, Target, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });
  const [errors, setErrors] = useState<string | null>(null);

  // Check if user is already logged in and listen for auth changes
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    // Listen for auth state changes (handles redirect after login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setErrors(null);
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setErrors('Email and password are required');
      return false;
    }
    if (activeTab === 'signup' && !formData.fullName) {
      setErrors('Full name is required for signup');
      return false;
    }
    if (formData.password.length < 6) {
      setErrors('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors('Invalid email or password. Please check your credentials.');
        } else {
          setErrors(error.message);
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in.",
        });
        navigate('/');
      }
    } catch (error: any) {
      setErrors(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setErrors('An account with this email already exists. Please try logging in instead.');
        } else {
          setErrors(error.message);
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Account created successfully!",
          description: "Welcome to your Financial Tracker. You can start managing your finances now.",
        });
        navigate('/');
      }
    } catch (error: any) {
      setErrors(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card/50">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Features */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-primary">
                <DollarSign className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Financial Tracker</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Take control of your finances with smart wallet management and intelligent tracking.
            </p>
          </div>

          <div className="grid gap-4">
            <FeatureCard
              icon={Wallet}
              title="Smart Wallet System"
              description="Organize your money into saving, needs, and wants wallets with automated allocation."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Income & Expense Tracking"
              description="Monitor your financial flow with detailed categorization and insights."
            />
            <FeatureCard
              icon={Target}
              title="Financial Goals"
              description="Set and track your financial goals with progress monitoring."
            />
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-xl border-0 bg-card/95 backdrop-blur">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4 lg:hidden">
                <div className="p-3 rounded-xl bg-primary">
                  <DollarSign className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'login' 
                  ? 'Sign in to your financial tracker' 
                  : 'Start your journey to financial freedom'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                {errors && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{errors}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        className="mobile-input"
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="mobile-input"
                        disabled={loading}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mobile-button" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="mobile-input"
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        className="mobile-input"
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="mobile-input"
                        disabled={loading}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 6 characters
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mobile-button" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;