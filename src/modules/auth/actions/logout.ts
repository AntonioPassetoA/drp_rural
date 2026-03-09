'use server'

import { redirect } from 'next/navigation'

export async function logout() {
  // Note: Client-side signOut from next-auth/react should be called
  // This action handles the server-side redirect
  redirect('/login')
}
