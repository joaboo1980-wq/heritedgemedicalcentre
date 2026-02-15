import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Eye, EyeOff, AlertCircle, CheckCircle, Mail, User, Building2, Image } from 'lucide-react';

interface ProfileData {
  full_name: string;
  email: string;
  department: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, signOut } = useAuth();
  
  // Local state for editing
  const [editedData, setEditedData] = useState<ProfileData>({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    department: profile?.department || '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch profile data
  const { isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (data) {
        setEditedData({
          full_name: data.full_name || '',
          email: data.email || '',
          department: data.department || '',
        });
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedData.full_name,
          email: editedData.email,
          department: editedData.department,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('No user ID');

      const fileName = `${user.id}/avatar_${Date.now()}`;
      
      // Upload file
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success('Avatar updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and security</p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="avatar">Avatar</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full-name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="full-name"
                    value={editedData.full_name}
                    onChange={(e) =>
                      setEditedData({ ...editedData, full_name: e.target.value })
                    }
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedData.email}
                    onChange={(e) =>
                      setEditedData({ ...editedData, email: e.target.value })
                    }
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact your administrator to change your email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={editedData.department || ''}
                    onChange={(e) =>
                      setEditedData({ ...editedData, department: e.target.value })
                    }
                    placeholder="e.g., Cardiology, Emergency, etc."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avatar Tab */}
        <TabsContent value="avatar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload or change your profile avatar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-6">
                {/* Current Avatar */}
                <div className="text-center">
                  <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-primary/20">
                    <AvatarImage 
                      src={previewUrl || profile?.avatar_url || undefined} 
                      alt={profile?.full_name}
                    />
                    <AvatarFallback className="text-xl">
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-muted-foreground">
                    {previewUrl ? 'Preview' : 'Current avatar'}
                  </p>
                </div>

                {/* Upload Area */}
                <div className="w-full">
                  <Label htmlFor="avatar-upload" className="flex items-center gap-2 mb-2">
                    <Image className="h-4 w-4" />
                    Upload New Avatar
                  </Label>
                  <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your image here or click to select
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum file size: 5MB (JPEG, PNG, GIF)
                    </p>
                  </div>
                </div>

                {selectedFile && (
                  <div className="w-full space-y-3">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={() => uploadAvatarMutation.mutate(selectedFile)}
                      disabled={uploadAvatarMutation.isPending}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadAvatarMutation.isPending ? 'Uploading...' : 'Upload Avatar'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
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
                    Password must be at least 8 characters long
                  </AlertDescription>
                </Alert>
              </div>

              <Button
                onClick={() => updatePasswordMutation.mutate()}
                disabled={updatePasswordMutation.isPending || !newPassword || !confirmPassword}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm text-foreground">{user?.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Created</p>
                  <p className="text-sm text-foreground">
                    {profile && new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Sign Out</CardTitle>
              <CardDescription>End your current session</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={async () => {
                  await signOut();
                  toast.success('Signed out successfully');
                  navigate('/auth');
                }}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
