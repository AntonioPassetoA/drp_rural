import { prisma } from '@/lib/prisma'
import { Municipality, Prisma } from '@prisma/client'

export type CreateMunicipalityData = {
  projectId: string
  name: string
  state: string
  ibgeCode?: string
  population?: number
  areaKm2?: number
}

export type UpdateMunicipalityData = {
  name?: string
  state?: string
  ibgeCode?: string
  population?: number
  areaKm2?: number
}

export async function getMunicipalitiesByProject(projectId: string): Promise<Municipality[]> {
  return prisma.municipality.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  })
}

export async function getMunicipalityById(id: string) {
  return prisma.municipality.findUnique({
    where: { id },
    include: {
      project: true,
      microregions: {
        include: {
          localities: true,
        },
      },
      diagnostics: true,
    },
  })
}

export async function createMunicipality(data: CreateMunicipalityData): Promise<Municipality> {
  return prisma.municipality.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      state: data.state,
      ibgeCode: data.ibgeCode,
      population: data.population,
      areaKm2: data.areaKm2 ? new Prisma.Decimal(data.areaKm2) : null,
    },
  })
}

export async function updateMunicipality(
  id: string,
  data: UpdateMunicipalityData
): Promise<Municipality> {
  return prisma.municipality.update({
    where: { id },
    data: {
      ...data,
      areaKm2: data.areaKm2 ? new Prisma.Decimal(data.areaKm2) : undefined,
    },
  })
}

export async function deleteMunicipality(id: string): Promise<void> {
  await prisma.municipality.delete({
    where: { id },
  })
}

export async function getMunicipalityStats(municipalityId: string) {
  const microregions = await prisma.microregion.findMany({
    where: { municipalityId },
    select: { id: true },
  })
  const microregionIds = microregions.map((m) => m.id)

  const [
    microregionsCount,
    localitiesCount,
    diagnosticsCount,
    completedDiagnosticsCount,
  ] = await Promise.all([
    prisma.microregion.count({ where: { municipalityId } }),
    prisma.locality.count({ where: { microregionId: { in: microregionIds } } }),
    prisma.diagnostic.count({ where: { municipalityId } }),
    prisma.diagnostic.count({ where: { municipalityId, status: 'completed' } }),
  ])

  return {
    microregions: microregionsCount,
    localities: localitiesCount,
    diagnostics: diagnosticsCount,
    completedDiagnostics: completedDiagnosticsCount,
  }
}

export async function getMunicipalitiesWithStats(projectId: string) {
  const municipalities = await prisma.municipality.findMany({
    where: { projectId },
    include: {
      _count: {
        select: {
          microregions: true,
          diagnostics: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return municipalities
}
