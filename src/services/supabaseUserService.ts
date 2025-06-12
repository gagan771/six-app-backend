import { supabaseAdmin } from "../config/supabase";
import { logger } from "./log.services";
import dotenv from 'dotenv';
dotenv.config();

const FIXED_PASSWORD = process.env.SUPABASE_FIXED_PASSWORD || '';

export async function loginOrCreateUser(phone: string) {
  console.log('loginOrCreateUser', phone)
  try {
    const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      phone,
      password: FIXED_PASSWORD,
    });
    console.log('login ho gaya')
    // If login successful, user exists
    if (!loginError && loginData.user) {
      return {
        success: true,
        user: loginData.user,
        session: loginData.session,
        isNewUser: false,
      };
    }
    console.log('login failed')
    // 2. If login failed, check if it's because user doesn't exist
    if (loginError && (
      loginError.message.includes('Invalid login credentials') ||
      loginError.message.includes('User not found') ||
      loginError.message.includes('Invalid email or password')
    )) {
      console.log('User does not exist, creating new user...');
      console.log('phone', phone)
      // 3. Create new user
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        password: FIXED_PASSWORD,
        phone_confirm: true,
      });
      console.log('createData', createData)
      console.log('createError', createError)
      if (createError) {
        throw new Error(`User creation failed: ${createError.message}`);
      }
      console.log('createData', createData)
      // 4. Log in the newly created user
      const { data: newLoginData, error: newLoginError } = await supabaseAdmin.auth.signInWithPassword({
        phone,
        password: FIXED_PASSWORD,
      });

      if (newLoginError) {  
        throw new Error(`Login after creation failed: ${newLoginError.message}`);
      }
      console.log('newLoginData', newLoginData)
      return {
        success: true,
        user: newLoginData.user,
        session: newLoginData.session,
        isNewUser: true,
      };
    }

  } catch (err: any) {
    await logger.error('loginOrCreateUser', 'Error logging in or creating user:', err);
    return { 
      success: false, 
      error: err.message || 'User login/creation failed',
      isNewUser: false,
    };
  }
}
