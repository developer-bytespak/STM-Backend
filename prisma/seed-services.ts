import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SERVICES_DATA = {
  "Accountant": ["Tax Filing", "Business Planning"],
  "Architect": ["Construction Drawings"],
  "Engineer": [],
  "Land Surveyor": [],
  "Computer Programmer": [],
  "Consultant": ["Business Planning"],
  "Software Specialist": ["Software Implementation"],
  "Handyman": ["Toilet Replacement", "Appliance Replacement"],
  "Veterinarian": [],
  "Photographer": [],
  "Real Estate Agent": [],
  "Mental Health Counselor": [],
  "In Home Health Care": [],
  "Tutor": [
    "Guitar Lessons",
    "Piano Lessons",
    "Jewelry Making Party",
    "Stained Glass Making Tutor",
    "Spanish Language Tutor"
  ],
  "Coach": ["Voice Coach", "Baseball Coach", "Softball Coach"],
  "BabySitting": [],
  "Plumber": ["Toilet Clog", "Toilet Replacement"],
  "Electrician": [],
  "HVAC": [],
  "Carpenter": [],
  "Garage Door Technician": [],
  "Windshield Technician": [],
  "Exterior Cleaner": [
    "House/Building Wash",
    "Gutter Cleaning",
    "Roof Cleaning",
    "Driveway Wash",
    "Deck Cleaning",
    "Window Washing"
  ],
  "Garbage and Junk Removal Specialist": [],
  "Copywriter": [],
  "Publisher": [],
  "Interior Cleaning": ["House Cleaning", "Office Cleaning"],
  "Pest Control": [],
  "Media Organizing": [],
  "Barber": [],
  "Hair Stylist": []
};

async function seedServices() {
  console.log('🌱 Starting service seeding...\n');

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const [category, services] of Object.entries(SERVICES_DATA)) {
    console.log(`📁 Category: ${category}`);

    if (services.length === 0) {
      console.log(`   ⚪ No services defined (empty category)\n`);
      continue;
    }

    for (const serviceName of services) {
      try {
        // Check if service already exists
        const existing = await prisma.services.findFirst({
          where: {
            name: serviceName,
            category: category,
          },
        });

        if (existing) {
          console.log(`   ⏭️  ${serviceName} (already exists - ID: ${existing.id})`);
          skippedCount++;
          continue;
        }

        // Create service
        const created = await prisma.services.create({
          data: {
            name: serviceName,
            category: category,
            description: `Professional ${serviceName.toLowerCase()} service in the ${category} category`,
            status: 'approved', // Pre-approved as per client requirement
            is_popular: false,
            questions_json: null, // Can be added later via admin panel
          },
        });

        console.log(`   ✅ ${serviceName} (ID: ${created.id})`);
        createdCount++;

      } catch (error) {
        console.error(`   ❌ Error creating ${serviceName}:`, error.message);
        errorCount++;
      }
    }

    console.log(''); // Empty line between categories
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 SEEDING COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Created:       ${createdCount} services`);
  console.log(`   ⏭️  Skipped:       ${skippedCount} services (already exist)`);
  console.log(`   ❌ Errors:        ${errorCount} services`);
  console.log(`   📂 Total categories: ${Object.keys(SERVICES_DATA).length}`);
  console.log(`   ⚪ Empty categories: ${Object.values(SERVICES_DATA).filter(s => s.length === 0).length}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Display category statistics
  const categoriesWithServices = Object.entries(SERVICES_DATA)
    .filter(([_, services]) => services.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  console.log('📈 Top Categories by Service Count:\n');
  categoriesWithServices.slice(0, 5).forEach(([category, services]) => {
    console.log(`   ${category}: ${services.length} service(s)`);
  });

  console.log('\n✨ Services are now searchable in the platform!');
}

// Run the seeder
seedServices()
  .catch((error) => {
    console.error('\n❌ SEEDING FAILED!\n');
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n👋 Database connection closed.');
  });

