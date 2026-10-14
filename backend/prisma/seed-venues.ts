import { PrismaClient, Venue } from '@prisma/client';

export interface SeededVenues {
  addisHQHallA: Venue;
  addisHQExecutiveLab: Venue;
  hawassaHub: Venue;
  bahirDarRoom: Venue;
  adamaCenter: Venue;
  direDawaLab: Venue;
  byBranch: Record<string, Venue[]>;
}

export const VENUE_DEFINITIONS = [
  {
    name: 'Addis Ababa HQ - Training Hall A',
    branch: 'Addis Ababa Head Office',
    building: 'Block B, 3rd Floor, Room 302',
    capacity: 35,
    facilities: ['Projector', 'Smart Board', 'Air Conditioning', 'WiFi', 'Sound System'],
  },
  {
    name: 'Addis Ababa HQ - Executive Lab 2',
    branch: 'Addis Ababa Head Office',
    building: 'Block A, 1st Floor, Room 108',
    capacity: 25,
    facilities: ['Individual Laptops', 'Dual Screens', 'Interactive Display', 'Video Conferencing', 'Gigabit LAN'],
  },
  {
    name: 'Hawassa Regional Training Hub',
    branch: 'Hawassa Branch Office',
    building: 'Southern Branch Complex, 2nd Floor',
    capacity: 30,
    facilities: ['Projector', 'Audio System', 'Backup Generator', 'High-speed Internet', 'Whiteboard'],
  },
  {
    name: 'Bahir Dar Branch Room 101',
    branch: 'Bahir Dar Branch Office',
    building: 'Lake Tana Revenue Center, Ground Floor',
    capacity: 28,
    facilities: ['Projector', 'Whiteboard', 'WiFi', 'UPS Power Backup'],
  },
  {
    name: 'Adama Branch Multi-Purpose Center',
    branch: 'Adama Branch Office',
    building: 'Main Administrative Hall, 1st Floor',
    capacity: 40,
    facilities: ['Ceiling Projector', 'PA Audio System', 'Fiber Internet', 'Air Conditioning'],
  },
  {
    name: 'Dire Dawa Revenue Training Lab',
    branch: 'Dire Dawa Branch Office',
    building: 'Eastern Division Building, 3rd Floor',
    capacity: 20,
    facilities: ['Computer Workstations', 'Smart Projector', 'Dedicated LAN', 'Air Conditioning'],
  },
];

export async function seedVenues(prisma: PrismaClient): Promise<SeededVenues> {
  console.log('🏢 Seeding Ministry Branch Venues...');

  const createdMap: Record<string, Venue> = {};
  const byBranch: Record<string, Venue[]> = {};

  for (const v of VENUE_DEFINITIONS) {
    const venue = await prisma.venue.create({
      data: {
        name: v.name,
        branch: v.branch,
        building: v.building,
        capacity: v.capacity,
        facilities: v.facilities,
        isActive: true,
      },
    });

    createdMap[v.name] = venue;
    if (!byBranch[v.branch]) byBranch[v.branch] = [];
    byBranch[v.branch].push(venue);

    console.log(`  ✓ Venue: ${v.name} (${v.branch}) - Capacity: ${v.capacity}`);
  }

  return {
    addisHQHallA: createdMap['Addis Ababa HQ - Training Hall A'],
    addisHQExecutiveLab: createdMap['Addis Ababa HQ - Executive Lab 2'],
    hawassaHub: createdMap['Hawassa Regional Training Hub'],
    bahirDarRoom: createdMap['Bahir Dar Branch Room 101'],
    adamaCenter: createdMap['Adama Branch Multi-Purpose Center'],
    direDawaLab: createdMap['Dire Dawa Revenue Training Lab'],
    byBranch,
  };
}

