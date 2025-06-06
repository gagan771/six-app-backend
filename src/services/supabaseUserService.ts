import { supabaseAdmin } from "../config/supabase";

const FIXED_PASSWORD = process.env.SUPABASE_FIXED_PASSWORD || '';

export async function loginOrCreateUser(phone: string) {
  try {
    const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      phone,
      password: FIXED_PASSWORD,
    });

    // If login successful, user exists
    if (!loginError && loginData.user) {
      console.log('User exists and login successful');
      return {
        success: true,
        user: loginData.user,
        session: loginData.session,
        isNewUser: false,
      };
    }

    // 2. If login failed, check if it's because user doesn't exist
    if (loginError && (
      loginError.message.includes('Invalid login credentials') ||
      loginError.message.includes('User not found') ||
      loginError.message.includes('Invalid email or password')
    )) {
      console.log('User does not exist, creating new user...');
      
      // 3. Create new user
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        password: FIXED_PASSWORD,
        phone_confirm: true,
      });

      if (createError) {
        throw new Error(`User creation failed: ${createError.message}`);
      }

      console.log('User created successfully');

      // 4. Log in the newly created user
      const { data: newLoginData, error: newLoginError } = await supabaseAdmin.auth.signInWithPassword({
        phone,
        password: FIXED_PASSWORD,
      });

      if (newLoginError) {
        throw new Error(`Login after creation failed: ${newLoginError.message}`);
      }

      return {
        success: true,
        user: newLoginData.user,
        session: newLoginData.session,
        isNewUser: true,
      };
    }

  } catch (err: any) {
    return { 
      success: false, 
      error: err.message || 'User login/creation failed',
      isNewUser: false,
    };
  }
}
