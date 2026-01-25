import prisma from '../utils/prisma.js';
import { notificationService } from './notification.service.js';
import crypto from 'crypto';

// RUT utilities for flexible search
function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

function formatRut(rut: string): string {
  const cleanedRut = cleanRut(rut);
  if (cleanedRut.length < 2) return cleanedRut;
  const body = cleanedRut.slice(0, -1);
  const verificationDigit = cleanedRut.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${verificationDigit}`;
}

// =============================================================================
// Types
// =============================================================================

interface ValidationEvent {
  deviceId: string;
  cktecoUserId: string;
  eventType: 'validate' | 'enroll';
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

interface ValidationResult {
  success: boolean;
  action: 'allow' | 'deny';
  studentId?: string;
  studentName?: string;
  ticketType?: string;
  ticketConsumed: boolean;
  reason?: string;
  eventId?: string;
}

interface EnrollmentData {
  studentRut: string;
  deviceId: string;
  cktecoUserId: string;
  templatesCount?: number;
}

interface StudentSyncData {
  studentId: string;
  cktecoUserId: string | null;
  rut: string;
  firstName: string;
  lastName: string;
  active: boolean;
}

interface TicketSyncData {
  studentId: string;
  cktecoUserId: string | null;
  ticketType: string;
  quantity: number;
}

interface OfflineEvent {
  cktecoUserId: string;
  eventType: 'validate' | 'enroll';
  timestamp: string;
  ticketType?: string;
  metadata?: Record<string, unknown>;
}

interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  details: Array<{
    cktecoUserId: string;
    timestamp: string;
    result: 'success' | 'failed' | 'conflict';
    reason?: string;
  }>;
}

// =============================================================================
// BiometricService
// =============================================================================

class BiometricService {
  /**
   * Register a new biometric enrollment for a student
   */
  async registerEnrollment(data: EnrollmentData): Promise<{
    success: boolean;
    enrollment?: any;
    error?: string;
  }> {
    try {
      // Find student by RUT (flexible search with multiple formats)
      const cleanedRut = cleanRut(data.studentRut);
      const formattedRut = formatRut(data.studentRut);
      const rutWithDash = `${cleanedRut.slice(0, -1)}-${cleanedRut.slice(-1)}`;

      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { rut: formattedRut },
            { rut: cleanedRut },
            { rut: rutWithDash },
          ],
        },
        include: { school: true },
      });

      if (!student) {
        return { success: false, error: 'Estudiante no encontrado' };
      }

      // Verify device exists and belongs to same school
      const device = await prisma.biometricDevice.findUnique({
        where: { id: data.deviceId },
      });

      if (!device) {
        return { success: false, error: 'Dispositivo no encontrado' };
      }

      if (device.schoolId !== student.schoolId) {
        return { success: false, error: 'Dispositivo no pertenece al colegio del estudiante' };
      }

      // Upsert enrollment (create or update)
      const enrollment = await prisma.biometricEnrollment.upsert({
        where: { studentId: student.id },
        create: {
          studentId: student.id,
          cktecoUserId: data.cktecoUserId,
          deviceId: data.deviceId,
          templatesCount: data.templatesCount || 1,
          active: true,
        },
        update: {
          cktecoUserId: data.cktecoUserId,
          deviceId: data.deviceId,
          templatesCount: data.templatesCount || 1,
          lastSyncAt: new Date(),
          active: true,
        },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, rut: true },
          },
        },
      });

      // Log enrollment event
      await prisma.biometricEvent.create({
        data: {
          studentId: student.id,
          deviceId: data.deviceId,
          eventType: 'enroll',
          result: 'success',
        },
      });

      return { success: true, enrollment };
    } catch (error) {
      console.error('[BiometricService] Error registering enrollment:', error);
      return { success: false, error: 'Error interno al registrar enrolamiento' };
    }
  }

  /**
   * Remove biometric enrollment for a student
   */
  async removeEnrollment(studentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const enrollment = await prisma.biometricEnrollment.findUnique({
        where: { studentId },
      });

      if (!enrollment) {
        return { success: false, error: 'Enrolamiento no encontrado' };
      }

      await prisma.biometricEnrollment.delete({
        where: { studentId },
      });

      return { success: true };
    } catch (error) {
      console.error('[BiometricService] Error removing enrollment:', error);
      return { success: false, error: 'Error interno al eliminar enrolamiento' };
    }
  }

  /**
   * Get enrollment status for a student
   */
  async getEnrollmentByRut(rut: string): Promise<{
    isEnrolled: boolean;
    enrollment?: any;
    student?: any;
  }> {
    // Flexible search with multiple RUT formats
    const cleanedRut = cleanRut(rut);
    const formattedRut = formatRut(rut);
    const rutWithDash = `${cleanedRut.slice(0, -1)}-${cleanedRut.slice(-1)}`;

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { rut: formattedRut },
          { rut: cleanedRut },
          { rut: rutWithDash },
        ],
      },
      include: {
        biometricEnrollment: true,
        school: { select: { id: true, name: true } },
      },
    });

    if (!student) {
      return { isEnrolled: false };
    }

    return {
      isEnrolled: !!student.biometricEnrollment?.active,
      enrollment: student.biometricEnrollment,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        rut: student.rut,
        school: student.school,
      },
    };
  }

  /**
   * Process a validation event from CKTECO device
   * This is the main entry point for fingerprint validation
   */
  async processValidationEvent(event: ValidationEvent): Promise<ValidationResult> {
    const { deviceId, cktecoUserId, timestamp } = event;

    try {
      // Verify device exists
      const device = await prisma.biometricDevice.findUnique({
        where: { id: deviceId },
      });

      if (!device || !device.active) {
        return {
          success: false,
          action: 'deny',
          ticketConsumed: false,
          reason: 'Dispositivo no autorizado',
        };
      }

      // Update device heartbeat
      await prisma.biometricDevice.update({
        where: { id: deviceId },
        data: { lastHeartbeat: new Date() },
      });

      // Find enrollment by CKTECO user ID
      const enrollment = await prisma.biometricEnrollment.findFirst({
        where: {
          cktecoUserId,
          active: true,
        },
        include: {
          student: {
            include: {
              tickets: true,
              guardians: {
                include: {
                  guardian: {
                    include: {
                      user: { select: { id: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!enrollment || !enrollment.student) {
        // Student not enrolled
        const eventRecord = await prisma.biometricEvent.create({
          data: {
            deviceId,
            eventType: 'validate_fail',
            result: 'not_enrolled',
            occurredAt: timestamp || new Date(),
          },
        });

        return {
          success: false,
          action: 'deny',
          ticketConsumed: false,
          reason: 'Estudiante no enrollado',
          eventId: eventRecord.id,
        };
      }

      const student = enrollment.student;
      const studentName = `${student.firstName} ${student.lastName}`;

      // Check for lunch ticket (almuerzo)
      const ticketType = 'almuerzo';
      const ticket = student.tickets.find(
        (t) => t.ticketType === ticketType && t.quantity > 0
      );

      if (!ticket) {
        // No tickets available - deny and notify
        const eventRecord = await prisma.biometricEvent.create({
          data: {
            studentId: student.id,
            deviceId,
            eventType: 'validate_fail',
            result: 'no_tickets',
            ticketType,
            ticketConsumed: false,
            occurredAt: timestamp || new Date(),
          },
        });

        // Notify guardians
        await this.notifyInsufficientTickets(student.id, studentName, student.guardians);

        return {
          success: false,
          action: 'deny',
          studentId: student.id,
          studentName,
          ticketType,
          ticketConsumed: false,
          reason: 'Sin tickets disponibles',
          eventId: eventRecord.id,
        };
      }

      // Has tickets - consume one and allow access
      const result = await prisma.$transaction(async (tx) => {
        // Decrement ticket
        await tx.studentTicket.update({
          where: { id: ticket.id },
          data: { quantity: { decrement: 1 } },
        });

        // Create success event
        const eventRecord = await tx.biometricEvent.create({
          data: {
            studentId: student.id,
            deviceId,
            eventType: 'validate_success',
            result: 'success',
            ticketType,
            ticketConsumed: true,
            occurredAt: timestamp || new Date(),
          },
        });

        return eventRecord;
      });

      return {
        success: true,
        action: 'allow',
        studentId: student.id,
        studentName,
        ticketType,
        ticketConsumed: true,
        eventId: result.id,
      };
    } catch (error) {
      console.error('[BiometricService] Error processing validation:', error);
      return {
        success: false,
        action: 'deny',
        ticketConsumed: false,
        reason: 'Error interno de validación',
      };
    }
  }

  /**
   * Notify guardians when student has insufficient tickets
   */
  private async notifyInsufficientTickets(
    studentId: string,
    studentName: string,
    guardians: Array<{ guardian: { user: { id: string } } }>
  ): Promise<void> {
    for (const { guardian } of guardians) {
      try {
        await notificationService.sendNotification({
          userId: guardian.user.id,
          title: 'Acceso rechazado - Sin tickets',
          body: `${studentName} intentó acceder al casino pero no tiene tickets disponibles. Por favor recarga su cuenta.`,
          data: {
            type: 'biometric_access_denied',
            studentId,
            studentName,
            reason: 'no_tickets',
          },
        });
      } catch (error) {
        console.error('[BiometricService] Error notifying guardian:', error);
      }
    }
  }

  /**
   * Get list of enrolled students for device sync
   */
  async getStudentsForSync(
    deviceId: string,
    lastSyncAt?: Date
  ): Promise<StudentSyncData[]> {
    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return [];
    }

    const whereClause: any = {
      student: { schoolId: device.schoolId },
      active: true,
    };

    // If lastSyncAt provided, only return changes since then
    if (lastSyncAt) {
      whereClause.OR = [
        { enrolledAt: { gt: lastSyncAt } },
        { lastSyncAt: { gt: lastSyncAt } },
      ];
    }

    const enrollments = await prisma.biometricEnrollment.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            rut: true,
            firstName: true,
            lastName: true,
            active: true,
          },
        },
      },
    });

    return enrollments.map((e) => ({
      studentId: e.student.id,
      cktecoUserId: e.cktecoUserId,
      rut: e.student.rut,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      active: e.active && e.student.active,
    }));
  }

  /**
   * Get tickets for enrolled students (for device sync)
   */
  async getTicketsForSync(deviceId: string): Promise<TicketSyncData[]> {
    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return [];
    }

    const enrollments = await prisma.biometricEnrollment.findMany({
      where: {
        student: { schoolId: device.schoolId },
        active: true,
      },
      include: {
        student: {
          include: {
            tickets: {
              where: { quantity: { gt: 0 } },
            },
          },
        },
      },
    });

    const result: TicketSyncData[] = [];

    for (const enrollment of enrollments) {
      for (const ticket of enrollment.student.tickets) {
        result.push({
          studentId: enrollment.studentId,
          cktecoUserId: enrollment.cktecoUserId,
          ticketType: ticket.ticketType,
          quantity: ticket.quantity,
        });
      }
    }

    return result;
  }

  /**
   * Process batch of offline events
   */
  async handleOfflineEvents(deviceId: string, events: OfflineEvent[]): Promise<BatchResult> {
    const details: BatchResult['details'] = [];
    let processed = 0;
    let failed = 0;

    // Sort events by timestamp to process in order
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const event of sortedEvents) {
      try {
        const result = await this.processValidationEvent({
          deviceId,
          cktecoUserId: event.cktecoUserId,
          eventType: event.eventType,
          timestamp: new Date(event.timestamp),
          metadata: event.metadata,
        });

        // Update the event record to mark as synced
        if (result.eventId) {
          await prisma.biometricEvent.update({
            where: { id: result.eventId },
            data: { syncedAt: new Date() },
          });
        }

        if (result.success) {
          processed++;
          details.push({
            cktecoUserId: event.cktecoUserId,
            timestamp: event.timestamp,
            result: 'success',
          });
        } else {
          failed++;
          details.push({
            cktecoUserId: event.cktecoUserId,
            timestamp: event.timestamp,
            result: result.reason === 'conflict' ? 'conflict' : 'failed',
            reason: result.reason,
          });
        }
      } catch (error) {
        failed++;
        details.push({
          cktecoUserId: event.cktecoUserId,
          timestamp: event.timestamp,
          result: 'failed',
          reason: 'Error interno',
        });
      }
    }

    return {
      success: failed === 0,
      processed,
      failed,
      details,
    };
  }

  // =============================================================================
  // Device Management
  // =============================================================================

  /**
   * Register a new biometric device
   * Returns the API key only once (it's hashed for storage)
   */
  async registerDevice(data: {
    name: string;
    schoolId: string;
    cafeteriaId: string;
  }): Promise<{ success: boolean; device?: any; apiKey?: string; error?: string }> {
    try {
      // Verify school and cafeteria exist
      const cafeteria = await prisma.cafeteria.findUnique({
        where: { id: data.cafeteriaId },
      });

      if (!cafeteria || cafeteria.schoolId !== data.schoolId) {
        return { success: false, error: 'Cafetería no válida para este colegio' };
      }

      // Generate unique API key (32 bytes = 64 hex characters)
      const apiKey = crypto.randomBytes(32).toString('hex');
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const device = await prisma.biometricDevice.create({
        data: {
          name: data.name,
          apiKeyHash,
          schoolId: data.schoolId,
          cafeteriaId: data.cafeteriaId,
          active: true,
        },
        include: {
          school: { select: { id: true, name: true } },
          cafeteria: { select: { id: true, name: true } },
        },
      });

      return {
        success: true,
        device: {
          id: device.id,
          name: device.name,
          school: device.school,
          cafeteria: device.cafeteria,
          active: device.active,
          createdAt: device.createdAt,
        },
        apiKey, // Only returned once!
      };
    } catch (error) {
      console.error('[BiometricService] Error registering device:', error);
      return { success: false, error: 'Error interno al registrar dispositivo' };
    }
  }

  /**
   * Verify device API key and return device info
   */
  async verifyDeviceApiKey(apiKey: string): Promise<{
    valid: boolean;
    device?: any;
  }> {
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const device = await prisma.biometricDevice.findUnique({
      where: { apiKeyHash },
      include: {
        school: { select: { id: true, name: true } },
        cafeteria: { select: { id: true, name: true } },
      },
    });

    if (!device || !device.active) {
      return { valid: false };
    }

    return { valid: true, device };
  }

  /**
   * List devices for a school
   */
  async listDevices(schoolId: string): Promise<any[]> {
    const devices = await prisma.biometricDevice.findMany({
      where: { schoolId },
      include: {
        cafeteria: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return devices.map((d) => ({
      id: d.id,
      name: d.name,
      cafeteria: d.cafeteria,
      lastHeartbeat: d.lastHeartbeat,
      active: d.active,
      createdAt: d.createdAt,
    }));
  }
}

export const biometricService = new BiometricService();
