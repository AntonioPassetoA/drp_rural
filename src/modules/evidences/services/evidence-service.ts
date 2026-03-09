import { prisma } from '@/lib/prisma'
import { Evidence, EvidenceType, Prisma } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

export type CreateEvidenceData = {
  evidenceType: EvidenceType
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  latitude?: number
  longitude?: number
  capturedAt?: Date
  taskId?: string
  diagnosticId?: string
  localityId?: string
}

export async function getEvidencesByTask(taskId: string): Promise<Evidence[]> {
  return prisma.evidence.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getEvidencesByDiagnostic(diagnosticId: string): Promise<Evidence[]> {
  return prisma.evidence.findMany({
    where: { diagnosticId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getEvidencesByLocality(localityId: string): Promise<Evidence[]> {
  return prisma.evidence.findMany({
    where: { localityId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getEvidenceById(id: string) {
  return prisma.evidence.findUnique({
    where: { id },
    include: {
      task: true,
      diagnostic: true,
      locality: true,
      uploadedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  })
}

export async function createEvidence(
  data: CreateEvidenceData,
  uploadedById: string
): Promise<Evidence> {
  return prisma.evidence.create({
    data: {
      evidenceType: data.evidenceType,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      latitude: data.latitude ? new Prisma.Decimal(data.latitude) : null,
      longitude: data.longitude ? new Prisma.Decimal(data.longitude) : null,
      capturedAt: data.capturedAt,
      taskId: data.taskId,
      diagnosticId: data.diagnosticId,
      localityId: data.localityId,
      uploadedById,
    },
  })
}

export async function deleteEvidence(id: string): Promise<void> {
  // Get evidence to get file URL
  const evidence = await getEvidenceById(id)
  if (!evidence) throw new Error('Evidence not found')

  // Delete file from local storage
  const filePath = evidence.fileUrl.replace(/^\/uploads\//, '')
  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  const fullPath = path.join(uploadDir, filePath)

  try {
    await fs.unlink(fullPath)
  } catch (error) {
    console.error('Error deleting file:', error)
    // Continue even if file deletion fails
  }

  // Delete record
  await prisma.evidence.delete({
    where: { id },
  })
}

export async function uploadFile(
  file: Buffer,
  fileName: string,
  projectId: string
): Promise<{ url: string; path: string }> {
  const uploadDir = process.env.UPLOAD_DIR || './uploads'

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const uniqueId = crypto.randomUUID()
  const ext = fileName.split('.').pop() || 'bin'

  const relativePath = `projects/${projectId}/evidences/${year}/${month}`
  const fullDir = path.join(uploadDir, relativePath)
  const fullFileName = `${uniqueId}.${ext}`
  const fullPath = path.join(fullDir, fullFileName)

  // Create directory if it doesn't exist
  await fs.mkdir(fullDir, { recursive: true })

  // Write file
  await fs.writeFile(fullPath, file)

  const url = `/uploads/${relativePath}/${fullFileName}`
  return { url, path: fullPath }
}

export async function getEvidencesByProject(projectId: string) {
  // Get all tasks for the project
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { id: true },
  })
  const taskIds = tasks.map((t) => t.id)

  // Get all municipalities for the project
  const municipalities = await prisma.municipality.findMany({
    where: { projectId },
    select: { id: true },
  })
  const municipalityIds = municipalities.map((m) => m.id)

  // Get all diagnostics for these municipalities
  const diagnostics = await prisma.diagnostic.findMany({
    where: { municipalityId: { in: municipalityIds } },
    select: { id: true },
  })
  const diagnosticIds = diagnostics.map((d) => d.id)

  // Get all microregions and localities
  const microregions = await prisma.microregion.findMany({
    where: { municipalityId: { in: municipalityIds } },
    select: { id: true },
  })
  const microregionIds = microregions.map((m) => m.id)

  const localities = await prisma.locality.findMany({
    where: { microregionId: { in: microregionIds } },
    select: { id: true },
  })
  const localityIds = localities.map((l) => l.id)

  // Get evidences
  return prisma.evidence.findMany({
    where: {
      OR: [
        { taskId: { in: taskIds } },
        { diagnosticId: { in: diagnosticIds } },
        { localityId: { in: localityIds } },
      ],
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
        },
      },
      diagnostic: {
        select: {
          id: true,
          formType: true,
        },
      },
      locality: {
        select: {
          id: true,
          name: true,
        },
      },
      uploadedBy: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}
