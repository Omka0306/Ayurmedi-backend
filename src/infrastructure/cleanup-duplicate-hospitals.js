const { getAllHospitals, deleteHospital } = require('../persistence/hospital.repo');

/**
 * Script to identify and remove duplicate hospitals
 * Keeps the oldest hospital for each hospital_code and soft-deletes the rest
 */
async function cleanupDuplicateHospitals() {
  console.log('Starting duplicate hospital cleanup...\n');

  try {
    // Get all hospitals
    const result = await getAllHospitals({ limit: 1000 });
    const hospitals = result.items;

    console.log(`Total hospitals found: ${hospitals.length}\n`);

    // Group hospitals by hospital_code
    const groupedByCode = {};
    hospitals.forEach(hospital => {
      const code = hospital.hospital_code;
      if (!groupedByCode[code]) {
        groupedByCode[code] = [];
      }
      groupedByCode[code].push(hospital);
    });

    // Find duplicates
    const duplicateCodes = Object.keys(groupedByCode).filter(
      code => groupedByCode[code].length > 1
    );

    console.log(`Hospital codes with duplicates: ${duplicateCodes.length}\n`);

    if (duplicateCodes.length === 0) {
      console.log('✅ No duplicate hospitals found!');
      return;
    }

    // Process each duplicate group
    let totalDeleted = 0;
    for (const code of duplicateCodes) {
      const duplicates = groupedByCode[code];
      
      // Sort by created_at to keep the oldest one
      duplicates.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );

      const toKeep = duplicates[0];
      const toDelete = duplicates.slice(1);

      console.log(`\n📋 Hospital Code: ${code}`);
      console.log(`   Total entries: ${duplicates.length}`);
      console.log(`   ✅ Keeping: ${toKeep.name} (${toKeep.hospital_id}) - Created: ${toKeep.created_at}`);
      console.log(`   🗑️  Deleting ${toDelete.length} duplicate(s):`);

      for (const hospital of toDelete) {
        console.log(`      - ${hospital.name} (${hospital.hospital_id}) - Created: ${hospital.created_at}`);
        
        // Uncomment the line below to actually delete duplicates
        await deleteHospital(hospital.hospital_id);
        
        totalDeleted++;
      }
    }

    console.log(`\n\n==============================================`);
    console.log(`📊 Summary:`);
    console.log(`   Unique hospital codes with duplicates: ${duplicateCodes.length}`);
    console.log(`   Total duplicate entries deleted: ${totalDeleted}`);
    console.log(`==============================================\n`);
    
    console.log('✅ Duplicate hospitals have been deleted (status set to INACTIVE)\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupDuplicateHospitals()
  .then(() => {
    console.log('\n✅ Cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup script failed:', error);
    process.exit(1);
  });
