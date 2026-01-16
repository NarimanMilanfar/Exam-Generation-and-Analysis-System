const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

console.log('🧪 Generating test coverage...');

try {
  // Generate coverage (ignore exit code if coverage thresholds aren't met)
  execSync('cross-env COVERAGE=true jest --coverage --passWithNoTests', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  // Coverage was generated but thresholds weren't met - continue anyway
  console.log('📊 Coverage generated (thresholds not met, but report available)');
}

// Check if HTML report exists
const htmlPath = path.join(process.cwd(), 'coverage', 'lcov-report', 'index.html');

if (fs.existsSync(htmlPath)) {
  console.log('🚀 Opening coverage report...');
  
  // Open HTML file using appropriate command for the platform
  let openCommand;
  
  if (process.platform === 'win32') {
    // Try different approaches for Windows
    const commands = [
      `start "" "${htmlPath}"`,
      `powershell -Command "Invoke-Item '${htmlPath}'"`
    ];
    
    for (const cmd of commands) {
      try {
        exec(cmd, (error) => {
          if (!error) {
            console.log('✅ Coverage report opened successfully!');
            return;
          }
        });
        break;
      } catch (e) {
        continue;
      }
    }
  } else if (process.platform === 'darwin') {
    exec(`open "${htmlPath}"`);
  } else {
    exec(`xdg-open "${htmlPath}"`);
  }
  
  console.log('📈 Coverage report location:', htmlPath);
} else {
  console.log('❌ Coverage report not found. Please run the tests first.');
} 