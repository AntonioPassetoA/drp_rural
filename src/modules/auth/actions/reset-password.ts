'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

const updatePasswordSchema = z.object({
  token: z.string().min(1, 'Token inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

export type ForgotPasswordState = {
  error?: string
  success?: boolean
  message?: string
}

export type UpdatePasswordState = {
  error?: string
  success?: boolean
}

export async function forgotPassword(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const rawData = {
    email: formData.get('email') as string,
  }

  const validatedFields = forgotPasswordSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message,
    }
  }

  const { email } = validatedFields.data

  const user = await prisma.user.findUnique({
    where: { email },
  })

  // Always return success to prevent email enumeration
  if (!user) {
    return {
      success: true,
      message: 'Se o email existir, você receberá um link de recuperação.',
    }
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

  // In a real implementation, you would:
  // 1. Store the token in a password_reset_tokens table
  // 2. Send email with the reset link
  // For now, we'll log the token (remove in production)
  console.log('Reset token for', email, ':', resetToken)

  return {
    success: true,
    message: 'Se o email existir, você receberá um link de recuperação.',
  }
}

export async function updatePassword(
  prevState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const rawData = {
    token: formData.get('token') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const validatedFields = updatePasswordSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message,
    }
  }

  const { password } = validatedFields.data

  // In a real implementation, you would:
  // 1. Validate the token from password_reset_tokens table
  // 2. Check if token is not expired
  // 3. Update the user's password
  // 4. Delete the used token

  // For now, we'll return an error since token validation is not implemented
  return {
    error: 'Funcionalidade de reset de senha requer configuração de email.',
  }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string; success?: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return { error: 'Usuário não encontrado' }
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

  if (!isPasswordValid) {
    return { error: 'Senha atual incorreta' }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })

  return { success: true }
}
