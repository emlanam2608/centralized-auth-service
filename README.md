# Authentication Service

A modern, secure authentication service built with Express.js, TypeScript, and Supabase.

## Features

- Email-based authentication
- JWT token management with refresh capabilities
- Role-based access control
- Password reset functionality
- Profile management
- Admin user management
- TypeScript for type safety and better developer experience
- Modular architecture for maintainability

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account and project

## Setup

1. **Clone the repository**

```bash
git clone
cd auth-service
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up Supabase**

- Create a Supabase project at https://supabase.com
- Run the following SQL in the Supabase SQL editor to set up the database:

```sql
-- Create a user_profiles table to extend the auth.users table with additional information
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    roles TEXT[] DEFAULT ARRAY['user'],
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Create policy to allow any authenticated user to read others' public profile info
CREATE POLICY "Authenticated users can view others' profiles"
    ON public.user_profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create policy to allow admins to read and modify all profiles
CREATE POLICY "Admins can do anything with profiles"
    ON public.user_profiles
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND 'admin' = ANY(roles)
        )
    );

-- Create function to handle new user registrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the updated_at column
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

4. **Configure environment variables**

Create a `.env` file in the root directory:

```
PORT=3000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

5. **Build the project**

```bash
npm run build
```

6. **Start the service**

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password (authenticated)
- `POST /api/auth/refresh` - Refresh authentication token
- `POST /api/auth/resend-verification` - Resend verification email

### Profile Management

- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Admin

- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/assign-role` - Assign role to user (admin only)

## Integration with Client Applications

To integrate with client applications, the authentication service provides JWT tokens that should be included in the Authorization header of subsequent requests:

```
Authorization: Bearer <access_token>
```

For more details on client integration, refer to the client examples in the documentation.

## Security Considerations

- All API calls should be made over HTTPS in production
- Store tokens securely in client applications
- Implement rate limiting for login attempts in production
- Consider adding multi-factor authentication for sensitive applications
