import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_USERS = [
  {
    email: 'provider1@test.com',
    first_name: 'John',
    last_name: 'Smith',
    phone_number: '555-0101',
    role: 'service_provider' as const,
    password: 'testpassword123',
    is_email_verified: true,
  },
  {
    email: 'provider2@test.com',
    first_name: 'Sarah',
    last_name: 'Johnson',
    phone_number: '555-0102',
    role: 'service_provider' as const,
    password: 'testpassword123',
    is_email_verified: true,
  },
  {
    email: 'provider3@test.com',
    first_name: 'Mike',
    last_name: 'Davis',
    phone_number: '555-0103',
    role: 'service_provider' as const,
    password: 'testpassword123',
    is_email_verified: true,
  },
  {
    email: 'lsm1@test.com',
    first_name: 'Lisa',
    last_name: 'Wilson',
    phone_number: '555-0201',
    role: 'local_service_manager' as const,
    password: 'testpassword123',
    is_email_verified: true,
  },
  {
    email: 'lsm2@test.com',
    first_name: 'David',
    last_name: 'Brown',
    phone_number: '555-0202',
    role: 'local_service_manager' as const,
    password: 'testpassword123',
    is_email_verified: true,
  },
];

// These will be populated after users are created
let createdUserIds: number[] = [];
let createdLsmIds: number[] = [];
let createdProviderIds: number[] = [];

// Service areas and provider services will be created with dynamic IDs

async function seedProviderData() {
  console.log('🌱 Starting provider data seeding...\n');

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // Step 1: Create test users
    console.log('👥 Step 1: Creating test users...');
    for (const userData of TEST_USERS) {
      try {
        // Check if user already exists
        const existing = await prisma.users.findUnique({
          where: { email: userData.email }
        });

        if (existing) {
          console.log(`   ⏭️  User ${userData.email} (ID: ${existing.id}) - already exists`);
          createdUserIds.push(existing.id);
          skippedCount++;
          continue;
        }

        const user = await prisma.users.create({
          data: userData
        });

        console.log(`   ✅ User ${user.email} (ID: ${user.id})`);
        createdUserIds.push(user.id);
        createdCount++;
      } catch (error) {
        console.error(`   ❌ Error creating user ${userData.email}:`, error.message);
        errorCount++;
      }
    }

    // Step 2: Create local service managers (for LSM users only)
    console.log('\n🏢 Step 2: Creating local service managers...');
    const lsmUsers = TEST_USERS.filter(user => user.role === 'local_service_manager');
    for (let i = 0; i < lsmUsers.length; i++) {
      const lsmUser = lsmUsers[i];
      const userId = createdUserIds[i + 3]; // LSM users are at indices 3,4
      
      try {
        const existing = await prisma.local_service_managers.findFirst({
          where: { user_id: userId }
        });

        if (existing) {
          console.log(`   ⏭️  LSM for user ${lsmUser.email} - already exists`);
          createdLsmIds.push(existing.id);
          skippedCount++;
          continue;
        }

        const lsm = await prisma.local_service_managers.create({
          data: {
            user_id: userId,
            region: i === 0 ? 'Oregon' : 'Texas',
            status: 'active' as const,
          }
        });

        console.log(`   ✅ LSM ${lsm.region} (ID: ${lsm.id}) for user ${lsmUser.email}`);
        createdLsmIds.push(lsm.id);
        createdCount++;
      } catch (error) {
        console.error(`   ❌ Error creating LSM for ${lsmUser.email}:`, error.message);
        errorCount++;
      }
    }

    // Step 3: Create service providers
    console.log('\n🔧 Step 3: Creating service providers...');
    const providerUsers = TEST_USERS.filter(user => user.role === 'service_provider');
    const providerData = [
      {
        business_name: 'Smith Cleaning Services',
        experience: 5,
        description: 'Professional cleaning services with 5+ years experience',
        location: 'Salem, OR',
        rating: 4.8,
        tier: 'Gold',
        experience_level: 'Expert',
        min_price: 80.00,
        max_price: 250.00,
      },
      {
        business_name: 'Johnson Plumbing Co',
        experience: 3,
        description: 'Reliable plumbing services for residential and commercial',
        location: 'Portland, OR',
        rating: 4.6,
        tier: 'Silver',
        experience_level: 'Professional',
        min_price: 100.00,
        max_price: 300.00,
      },
      {
        business_name: 'Davis Electric Solutions',
        experience: 7,
        description: 'Expert electrical services and repairs',
        location: 'Dallas, TX',
        rating: 4.9,
        tier: 'Gold',
        experience_level: 'Expert',
        min_price: 120.00,
        max_price: 400.00,
      },
    ];

    for (let i = 0; i < providerUsers.length; i++) {
      const providerUser = providerUsers[i];
      const userId = createdUserIds[i]; // Provider users are at indices 0,1,2
      const lsmId = i < 2 ? createdLsmIds[0] : createdLsmIds[1]; // First 2 use Oregon LSM, 3rd uses Texas LSM
      
      try {
        const existing = await prisma.service_providers.findFirst({
          where: { user_id: userId }
        });

        if (existing) {
          console.log(`   ⏭️  Provider ${providerData[i].business_name} - already exists`);
          createdProviderIds.push(existing.id);
          skippedCount++;
          continue;
        }

        const provider = await prisma.service_providers.create({
          data: {
            user_id: userId,
            lsm_id: lsmId,
            status: 'active' as const,
            total_jobs: [150, 75, 200][i],
            earning: [15000.00, 8500.00, 25000.00][i],
            ...providerData[i]
          }
        });

        console.log(`   ✅ Provider ${provider.business_name} (ID: ${provider.id})`);
        createdProviderIds.push(provider.id);
        createdCount++;
      } catch (error) {
        console.error(`   ❌ Error creating provider ${providerData[i].business_name}:`, error.message);
        errorCount++;
      }
    }

    // Step 4: Create service areas
    console.log('\n📍 Step 4: Creating service areas...');
    const serviceAreas = [
      // Provider 0 (Smith Cleaning) - Oregon area
      { providerIndex: 0, zipcode: '97301', is_primary: true },
      { providerIndex: 0, zipcode: '97302', is_primary: false },
      { providerIndex: 0, zipcode: '97303', is_primary: false },
      
      // Provider 1 (Johnson Plumbing) - Portland area
      { providerIndex: 1, zipcode: '97201', is_primary: true },
      { providerIndex: 1, zipcode: '97202', is_primary: false },
      { providerIndex: 1, zipcode: '97205', is_primary: false },
      { providerIndex: 1, zipcode: '97210', is_primary: false },
      
      // Provider 2 (Davis Electric) - Dallas area
      { providerIndex: 2, zipcode: '75001', is_primary: true },
      { providerIndex: 2, zipcode: '75002', is_primary: false },
      { providerIndex: 2, zipcode: '75201', is_primary: false },
      { providerIndex: 2, zipcode: '75003', is_primary: false },
    ];

    for (const areaData of serviceAreas) {
      try {
        const providerId = createdProviderIds[areaData.providerIndex];
        
        const existing = await prisma.provider_service_areas.findFirst({
          where: {
            provider_id: providerId,
            zipcode: areaData.zipcode
          }
        });

        if (existing) {
          console.log(`   ⏭️  Area ${areaData.zipcode} for Provider ${providerId} - already exists`);
          skippedCount++;
          continue;
        }

        const area = await prisma.provider_service_areas.create({
          data: {
            provider_id: providerId,
            zipcode: areaData.zipcode,
            is_primary: areaData.is_primary,
          }
        });

        console.log(`   ✅ Area ${area.zipcode} for Provider ${providerId} (ID: ${area.id})`);
        createdCount++;
      } catch (error) {
        console.error(`   ❌ Error creating area ${areaData.zipcode}:`, error.message);
        errorCount++;
      }
    }

    // Step 5: Link providers to services
    console.log('\n🔗 Step 5: Linking providers to services...');
    const providerServices = [
      // Provider 0 (Smith Cleaning) - Interior Cleaning services
      { providerIndex: 0, service_id: 41, service_name: 'House Cleaning' },
      { providerIndex: 0, service_id: 42, service_name: 'Office Cleaning' },
      
      // Provider 1 (Johnson Plumbing) - Plumber services
      { providerIndex: 1, service_id: 25, service_name: 'Toilet Clog' },
      { providerIndex: 1, service_id: 26, service_name: 'Toilet Replacement' },
      
      // Provider 2 (Davis Electric) - Electrician (standalone service)
      { providerIndex: 2, service_id: 29, service_name: 'Electrician' },
    ];

    for (const psData of providerServices) {
      try {
        const providerId = createdProviderIds[psData.providerIndex];
        
        const existing = await prisma.provider_services.findFirst({
          where: {
            provider_id: providerId,
            service_id: psData.service_id
          }
        });

        if (existing) {
          console.log(`   ⏭️  Provider ${providerId} → ${psData.service_name} - already exists`);
          skippedCount++;
          continue;
        }

        const ps = await prisma.provider_services.create({
          data: {
            provider_id: providerId,
            service_id: psData.service_id,
            is_active: true,
          }
        });

        console.log(`   ✅ Provider ${ps.provider_id} → ${psData.service_name} (ID: ${ps.id})`);
        createdCount++;
      } catch (error) {
        console.error(`   ❌ Error linking provider to ${psData.service_name}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉 PROVIDER DATA SEEDING COMPLETE!\n');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Created:       ${createdCount} records`);
    console.log(`   ⏭️  Skipped:       ${skippedCount} records (already exist)`);
    console.log(`   ❌ Errors:        ${errorCount} records`);
    console.log(`   👥 Users:         ${TEST_USERS.length}`);
    console.log(`   🏢 LSMs:          ${lsmUsers.length}`);
    console.log(`   🔧 Providers:     ${providerUsers.length}`);
    console.log(`   📍 Service Areas: ${serviceAreas.length}`);
    console.log(`   🔗 Provider Services: ${providerServices.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    // Show available ZIP codes
    const uniqueZips = await prisma.provider_service_areas.findMany({
      select: { zipcode: true },
      distinct: ['zipcode'],
      orderBy: { zipcode: 'asc' }
    });

    console.log('📍 Available ZIP codes for testing:');
    uniqueZips.forEach((zip, index) => {
      console.log(`${index + 1}. ${zip.zipcode}`);
    });

    console.log('\n🧪 Test your APIs now:');
    console.log('Location Search: GET /api/homepage/search/locations?query=973');
    console.log('Provider Search: POST /api/homepage/search/providers');
    console.log('   Body: { "service": "House Cleaning", "zipcode": "97301" }');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED!\n');
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Database connection closed.');
  }
}

// Run the seeder
seedProviderData()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
