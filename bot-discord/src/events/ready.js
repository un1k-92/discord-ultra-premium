import { logger } from '../utils/logger.js';

export function readyHandler(client) {
  logger.info(`[READY] Connecté en tant que ${client.user.tag}`);
}
