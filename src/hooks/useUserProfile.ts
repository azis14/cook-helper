import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { UserProfile } from '../types';

type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data: existingProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (existingProfile) {
        setProfile(existingProfile);
      } else {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({ user_id: userId })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Omit<UserProfileUpdate, 'user_id'>) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    }
  };

  const updateUsername = async (username: string) => {
    return updateProfile({ username: username.trim() || null });
  };

  const updateFullName = async (fullName: string) => {
    return updateProfile({ full_name: fullName.trim() || null });
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateUsername,
    updateFullName,
    refetch: fetchProfile,
  };
}