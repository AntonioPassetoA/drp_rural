import { prisma } from '@/lib/prisma'
import { Diagnostic, DiagnosticStatus, DiagnosticFormType, Prisma } from '@prisma/client'

export type CreateDiagnosticData = {
  municipalityId: string
  formType: DiagnosticFormType
  data?: Prisma.InputJsonValue
  status?: DiagnosticStatus
}

export type UpdateDiagnosticData = {
  data?: Prisma.InputJsonValue
  status?: DiagnosticStatus
}

export async function getDiagnosticsByMunicipality(
  municipalityId: string
): Promise<Diagnostic[]> {
  return prisma.diagnostic.findMany({
    where: { municipalityId },
    orderBy: { formType: 'asc' },
  })
}

export async function getDiagnosticById(id: string) {
  return prisma.diagnostic.findUnique({
    where: { id },
    include: {
      municipality: true,
      filledBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      evidences: true,
    },
  })
}

export async function getDiagnosticByMunicipalityAndType(
  municipalityId: string,
  formType: DiagnosticFormType
) {
  return prisma.diagnostic.findUnique({
    where: {
      municipalityId_formType: {
        municipalityId,
        formType,
      },
    },
    include: {
      municipality: true,
      filledBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      evidences: true,
    },
  })
}

export async function createDiagnostic(
  data: CreateDiagnosticData,
  filledById: string
): Promise<Diagnostic> {
  return prisma.diagnostic.create({
    data: {
      municipalityId: data.municipalityId,
      formType: data.formType,
      data: data.data || {},
      status: data.status || 'draft',
      filledById,
    },
  })
}

export async function updateDiagnostic(
  id: string,
  data: UpdateDiagnosticData,
  filledById: string
): Promise<Diagnostic> {
  const updateData: Prisma.DiagnosticUpdateInput = {
    filledBy: { connect: { id: filledById } },
  }

  if (data.data !== undefined) {
    updateData.data = data.data
  }

  if (data.status !== undefined) {
    updateData.status = data.status
  }

  // Set filledAt when status changes to completed
  if (data.status === 'completed') {
    updateData.filledAt = new Date()
  }

  return prisma.diagnostic.update({
    where: { id },
    data: updateData,
  })
}

export async function upsertDiagnostic(
  municipalityId: string,
  formType: DiagnosticFormType,
  formData: Prisma.InputJsonValue,
  status: DiagnosticStatus,
  filledById: string
): Promise<Diagnostic> {
  const existingDiagnostic = await getDiagnosticByMunicipalityAndType(
    municipalityId,
    formType
  )

  if (existingDiagnostic) {
    return updateDiagnostic(existingDiagnostic.id, { data: formData, status }, filledById)
  }

  return createDiagnostic(
    {
      municipalityId,
      formType,
      data: formData,
      status,
    },
    filledById
  )
}

export async function deleteDiagnostic(id: string): Promise<void> {
  await prisma.diagnostic.delete({
    where: { id },
  })
}

export async function getDiagnosticProgress(municipalityId: string) {
  const diagnostics = await prisma.diagnostic.findMany({
    where: { municipalityId },
    select: {
      formType: true,
      status: true,
    },
  })

  const allFormTypes: DiagnosticFormType[] = [
    'municipality_history',
    'drp_summary',
    'applied_methodology',
    'social_reality',
    'environmental_reality',
    'productive_vocations',
    'main_actions',
    'final_recommendations',
  ]

  const progress = allFormTypes.map((formType) => {
    const diagnostic = diagnostics.find((d) => d.formType === formType)
    return {
      formType,
      status: diagnostic?.status || 'not_started',
    }
  })

  const completed = progress.filter((p) => p.status === 'completed').length
  const total = allFormTypes.length

  return {
    progress,
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  }
}

export async function getDiagnosticsByProject(projectId: string) {
  const municipalities = await prisma.municipality.findMany({
    where: { projectId },
    select: { id: true },
  })
  const municipalityIds = municipalities.map((m) => m.id)

  return prisma.diagnostic.findMany({
    where: { municipalityId: { in: municipalityIds } },
    include: {
      municipality: {
        select: {
          id: true,
          name: true,
          state: true,
        },
      },
      filledBy: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: [
      { municipality: { name: 'asc' } },
      { formType: 'asc' },
    ],
  })
}
