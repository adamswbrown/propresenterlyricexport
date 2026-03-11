/**
 * Planned Service Store
 * Persistent storage for pre-planned service configurations.
 * Stores planned services in ~/.propresenter-words/planned-services.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { PlannedService, PraiseSlotType, PlannedSlotItem } from '../types/playlist';

const CONFIG_DIR = path.join(os.homedir(), '.propresenter-words');
const PLANNED_SERVICES_FILE = path.join(CONFIG_DIR, 'planned-services.json');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load all planned services from disk
 */
export function loadPlannedServices(): PlannedService[] {
  try {
    if (!fs.existsSync(PLANNED_SERVICES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(PLANNED_SERVICES_FILE, 'utf-8');
    return JSON.parse(data) as PlannedService[];
  } catch {
    return [];
  }
}

/**
 * Save all planned services to disk
 */
function saveAllPlannedServices(services: PlannedService[]): void {
  ensureConfigDir();
  fs.writeFileSync(PLANNED_SERVICES_FILE, JSON.stringify(services, null, 2), 'utf-8');
}

/**
 * Get a single planned service by ID
 */
export function getPlannedService(id: string): PlannedService | undefined {
  const services = loadPlannedServices();
  return services.find(s => s.id === id);
}

/**
 * Save (create or update) a planned service
 */
export function savePlannedService(service: Omit<PlannedService, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): PlannedService {
  const services = loadPlannedServices();
  const now = new Date().toISOString();

  if (service.id) {
    // Update existing
    const index = services.findIndex(s => s.id === service.id);
    if (index >= 0) {
      const updated: PlannedService = {
        ...services[index],
        ...service,
        id: service.id,
        updatedAt: now,
      };
      services[index] = updated;
      saveAllPlannedServices(services);
      return updated;
    }
  }

  // Create new
  const newService: PlannedService = {
    id: randomUUID(),
    name: service.name,
    date: service.date,
    templatePlaylistId: service.templatePlaylistId,
    slots: service.slots,
    notes: service.notes,
    createdAt: now,
    updatedAt: now,
  };
  services.push(newService);
  saveAllPlannedServices(services);
  return newService;
}

/**
 * Delete a planned service by ID
 */
export function deletePlannedService(id: string): boolean {
  const services = loadPlannedServices();
  const filtered = services.filter(s => s.id !== id);
  if (filtered.length < services.length) {
    saveAllPlannedServices(filtered);
    return true;
  }
  return false;
}

/**
 * Create an empty slots record
 */
export function createEmptySlots(): Record<PraiseSlotType, PlannedSlotItem[]> {
  return {
    praise1: [],
    praise2: [],
    praise3: [],
    kids: [],
    reading: [],
  };
}
