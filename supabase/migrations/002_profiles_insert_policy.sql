-- Allow authenticated users to insert their own profile record if it does not exist
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
