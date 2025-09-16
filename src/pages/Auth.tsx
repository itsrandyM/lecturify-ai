import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const Auth = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
        navigate('/');
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast({ title: 'Check your email', description: 'Confirm your email to finish signup.' });
      }
    } catch (err: any) {
      toast({ title: 'Authentication error', description: err.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">LectureAI Login</h1>
          <p className="text-muted-foreground mt-2">Securely access your lectures</p>
        </div>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </Button>
            </form>
            <div className="text-sm text-center mt-4 text-muted-foreground">
              {mode === 'signin' ? (
                <button className="story-link" onClick={() => setMode('signup')}>No account? Create one</button>
              ) : (
                <button className="story-link" onClick={() => setMode('signin')}>Have an account? Sign in</button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
