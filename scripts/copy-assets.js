const fs = require('fs-extra');
const path = require('path');

// Define paths
const srcAssetsDir = path.join(__dirname, '..', 'src', 'assets');
const distAssetsDir = path.join(__dirname, '..', 'dist', 'assets');

// Function to copy assets
async function copyAssets() {
  try {
    // Check if source assets directory exists
    if (!fs.existsSync(srcAssetsDir)) {
      console.log(`Source assets directory not found: ${srcAssetsDir}`);
      return;
    }

    // Ensure the destination directory exists
    await fs.ensureDir(distAssetsDir);

    // Copy assets from src to dist
    await fs.copy(srcAssetsDir, distAssetsDir);
    
    console.log(`Assets copied from ${srcAssetsDir} to ${distAssetsDir}`);
  } catch (error) {
    console.error('Error copying assets:', error);
    process.exit(1);
  }
}

// Run the copy function
copyAssets(); 