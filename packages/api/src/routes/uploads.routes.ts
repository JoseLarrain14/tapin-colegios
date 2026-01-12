import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads directory relative to the api package root
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
}

export async function uploadsRoutes(app: FastifyInstance) {
  // Register multipart plugin for this route prefix
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
      files: 1, // Only one file at a time
    },
  });

  // Ensure uploads directory exists on startup
  await ensureUploadsDir();

  /**
   * POST /api/v1/uploads/image
   * Upload an image file
   */
  app.post('/image', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No se proporciono ningun archivo',
        });
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          message: 'Tipo de archivo no permitido. Solo se aceptan imagenes (JPEG, PNG, GIF, WebP)',
        });
      }

      // Generate unique filename
      const extension = data.mimetype.split('/')[1];
      const filename = `${randomUUID()}.${extension}`;
      const filepath = path.join(UPLOADS_DIR, filename);

      // Save file
      const buffer = await data.toBuffer();
      await fs.writeFile(filepath, buffer);

      // Generate URL
      const baseUrl = `http://localhost:3000`;
      const url = `${baseUrl}/uploads/${filename}`;

      return reply.send({
        success: true,
        message: 'Imagen subida exitosamente',
        data: {
          filename,
          url,
          mimetype: data.mimetype,
          size: buffer.length,
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al subir la imagen',
      });
    }
  });

  /**
   * DELETE /api/v1/uploads/:filename
   * Delete an uploaded file
   */
  app.delete('/:filename', async (request: FastifyRequest<{ Params: { filename: string } }>, reply: FastifyReply) => {
    try {
      const { filename } = request.params;

      // Validate filename (prevent directory traversal)
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return reply.status(400).send({
          success: false,
          message: 'Nombre de archivo invalido',
        });
      }

      const filepath = path.join(UPLOADS_DIR, filename);

      try {
        await fs.unlink(filepath);
        return reply.send({
          success: true,
          message: 'Archivo eliminado',
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return reply.status(404).send({
            success: false,
            message: 'Archivo no encontrado',
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Delete upload error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al eliminar el archivo',
      });
    }
  });
}
