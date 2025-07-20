#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

const testDir = path.join(__dirname);
const rootDir = path.join(__dirname, "../..");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${description}`, "cyan");
  log(`Running: ${command}`, "yellow");

  try {
    const output = execSync(command, {
      cwd: rootDir,
      stdio: "inherit",
      encoding: "utf8",
    });
    log(`✅ ${description} completed successfully`, "green");
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, "red");
    log(`Error: ${error.message}`, "red");
    return false;
  }
}

function main() {
  log("🚀 Running Messaging System Test Suite", "bright");
  log("=====================================", "bright");

  const testSuites = [
    {
      command: `npx jest ${testDir}/messagingCoreFixed.test.ts --config=${testDir}/jest.config.js`,
      description: "Core Functionality Tests",
    },
    {
      command: `npx jest ${testDir}/messagingIntegrationFixed.test.ts --config=${testDir}/jest.config.js`,
      description: "Integration Tests",
    },
    {
      command: `npx jest ${testDir}/crossPlatformSyncFixed.test.ts --config=${testDir}/jest.config.js`,
      description: "Cross-Platform Sync Tests",
    },
    {
      command: `npx jest ${testDir}/messagingPerformanceFixed.test.ts --config=${testDir}/jest.config.js`,
      description: "Performance Tests",
    },
  ];

  let passedTests = 0;
  let totalTests = testSuites.length;

  for (const suite of testSuites) {
    if (runCommand(suite.command, suite.description)) {
      passedTests++;
    }
  }

  log("\n📊 Test Results Summary", "bright");
  log("======================", "bright");
  log(`Total Test Suites: ${totalTests}`, "blue");
  log(
    `Passed: ${passedTests}`,
    passedTests === totalTests ? "green" : "yellow"
  );
  log(
    `Failed: ${totalTests - passedTests}`,
    totalTests - passedTests === 0 ? "green" : "red"
  );

  if (passedTests === totalTests) {
    log("\n🎉 All messaging tests passed!", "green");
    process.exit(0);
  } else {
    log("\n💥 Some tests failed. Please check the output above.", "red");
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  log("Messaging Test Suite Runner", "bright");
  log("Usage: node runTests.js [options]", "cyan");
  log("\nOptions:", "yellow");
  log("  --help, -h     Show this help message");
  log("  --coverage     Run tests with coverage report");
  log("  --watch        Run tests in watch mode");
  log("  --core         Run only core functionality tests");
  log("  --integration  Run only integration tests");
  log("  --sync         Run only cross-platform sync tests");
  log("  --performance  Run only performance tests");
  process.exit(0);
}

if (args.includes("--coverage")) {
  log("Running tests with coverage report...", "cyan");
  runCommand(
    `npx jest ${testDir} --config=${testDir}/jest.config.js --coverage`,
    "All Tests with Coverage"
  );
  process.exit(0);
}

if (args.includes("--watch")) {
  log("Running tests in watch mode...", "cyan");
  runCommand(
    `npx jest ${testDir} --config=${testDir}/jest.config.js --watch`,
    "All Tests (Watch Mode)"
  );
  process.exit(0);
}

if (args.includes("--core")) {
  runCommand(
    `npx jest ${testDir}/messagingCoreFixed.test.ts --config=${testDir}/jest.config.js`,
    "Core Functionality Tests Only"
  );
  process.exit(0);
}

if (args.includes("--integration")) {
  runCommand(
    `npx jest ${testDir}/messagingIntegrationFixed.test.ts --config=${testDir}/jest.config.js`,
    "Integration Tests Only"
  );
  process.exit(0);
}

if (args.includes("--sync")) {
  runCommand(
    `npx jest ${testDir}/crossPlatformSyncFixed.test.ts --config=${testDir}/jest.config.js`,
    "Cross-Platform Sync Tests Only"
  );
  process.exit(0);
}

if (args.includes("--performance")) {
  runCommand(
    `npx jest ${testDir}/messagingPerformanceFixed.test.ts --config=${testDir}/jest.config.js`,
    "Performance Tests Only"
  );
  process.exit(0);
}

// Run all tests by default
main();
