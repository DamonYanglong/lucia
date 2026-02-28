import { FastifyPluginAsync } from 'fastify';
import { loadConfig } from '../config/loader';
import { getCommonTimezones, isValidTimezone } from '../utils/timezone';

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get server settings including timezone
  fastify.get('/settings', async () => {
    const config = await loadConfig();
    const timezones = getCommonTimezones();

    return {
      success: true,
      data: {
        timezone: config.timezone,
        timezones,
      },
    };
  });

  // Validate a timezone
  fastify.get('/settings/timezone/validate', async (request, reply) => {
    const { tz } = request.query as { tz?: string };

    if (!tz) {
      return reply.status(400).send({
        success: false,
        error: 'Missing timezone parameter',
      });
    }

    return {
      success: true,
      data: {
        timezone: tz,
        valid: isValidTimezone(tz),
      },
    };
  });
};

export default settingsRoutes;
