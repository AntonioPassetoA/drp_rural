import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed']).default('active'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
