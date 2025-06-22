/*
  # Add feedback table for beta user feedback

  1. New Tables
    - `user_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users, nullable for anonymous feedback)
      - `feedback_text` (text, the feedback content)
      - `user_email` (text, nullable, for contact if needed)
      - `page_url` (text, nullable, which page the feedback was submitted from)
      - `user_agent` (text, nullable, browser/device info)
      - `is_read` (boolean, for admin to track read status)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_feedback` table
    - Allow authenticated users to insert feedback
    - Only service role can read all feedback (for admin review)

  3. Indexes
    - Index on created_at for chronological sorting
    - Index on is_read for filtering unread feedback
*/

CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_text text NOT NULL,
  user_email text,
  page_url text,
  user_agent text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own feedback
CREATE POLICY "Authenticated users can insert feedback"
  ON user_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow service role to read all feedback (for admin review)
CREATE POLICY "Service role can read all feedback"
  ON user_feedback
  FOR SELECT
  TO service_role
  USING (true);

-- Allow service role to update feedback (mark as read, etc.)
CREATE POLICY "Service role can update feedback"
  ON user_feedback
  FOR UPDATE
  TO service_role
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS user_feedback_is_read_idx ON user_feedback(is_read);
CREATE INDEX IF NOT EXISTS user_feedback_user_id_idx ON user_feedback(user_id);