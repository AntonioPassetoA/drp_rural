import { prisma } from '@/lib/prisma'
import { User, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export type CreateUserData = {
  email: string
  password: string
  fullName: string
  role?: UserRole
  phone?: string
}

export type UpdateUserData = {
  fullName?: string
  role?: UserRole
  phone?: string
  avatarUrl?: string
}

export async function getUsers(): Promise<User[]> {
  return prisma.user.findMany({
    orderBy: { fullName: 'asc' },
  })
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  })
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  })
}

export async function createUser(data: CreateUserData): Promise<User> {
  const hashedPassword = await bcrypt.hash(data.password, 10)

  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      fullName: data.fullName,
      role: data.role || 'operator',
      phone: data.phone,
    },
  })
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  return prisma.user.update({
    where: { id },
    data,
  })
}

export async function updateUserPassword(id: string, newPassword: string): Promise<void> {
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  })
}

export async function deactivateUser(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  })
}

export async function reactivateUser(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { isActive: true },
  })
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({
    where: { id },
  })
}

export async function getActiveUsers(): Promise<User[]> {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { fullName: 'asc' },
  })
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  return prisma.user.findMany({
    where: { role, isActive: true },
    orderBy: { fullName: 'asc' },
  })
}
