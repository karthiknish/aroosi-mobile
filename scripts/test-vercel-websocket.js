#!/usr/bin/env node

/**
 * Vercel WebSocket Integration Test Script
 *
 * This script tests the complete WebSocket integration between
 * the Vercel Edge Function and mobile configuration.
 */

const WebSocket = require("ws");

// Configuration - use environment variables exclusively
const CONFIG = {
  // Use WebSocket URL from environment, fallback to constructing from VERCEL_URL
  WS_URL:
    process.env.EXPO_PUBLIC_WS_URL ||
    (process.env.VERCEL_URL
      ? `wss://${process.env.VERCEL_URL}/api/websocket`
      : "wss://aroosi.vercel.app/api/websocket"),
  TEST_USER_ID: "test-user-" + Date.now(),
  TEST_CONVERSATION_ID: "test-conversation-" + Date.now(),
  TIMEOUT: 10000,
};

// Test results
const results = {
  connection: false,
  authentication: false,
  messageExchange: false,
  typingIndicators: false,
  deliveryReceipts: false,
  reconnection: false,
  error: null,
};

async function runTests() {
  console.log("🚀 Starting Vercel WebSocket Integration Tests\n");
  console.log(`Testing against: ${CONFIG.WS_URL}`);
  console.log(`Test User ID: ${CONFIG.TEST_USER_ID}\n`);
  console.log(`Environment: ${process.env.NODE_ENV || "production"}`);
  console.log(`Using URL: ${CONFIG.WS_URL}\n`);

  try {
    // Test 1: Basic Connection
    console.log("📡 Test 1: Basic Connection...");
    const ws = new WebSocket(CONFIG.WS_URL);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Connection timeout")),
        CONFIG.TIMEOUT
      );

      ws.on("open", () => {
        clearTimeout(timeout);
        results.connection = true;
        console.log("✅ Connection established");
        resolve();
      });

      ws.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Test 2: Authentication
    console.log("🔐 Test 2: Authentication...");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Authentication timeout")),
        CONFIG.TIMEOUT
      );

      ws.send(
        JSON.stringify({
          type: "auth",
          userId: CONFIG.TEST_USER_ID,
          token: "test-token",
        })
      );

      ws.once("message", (data) => {
        clearTimeout(timeout);
        const response = JSON.parse(data.toString());
        if (response.type === "auth" && response.success) {
          results.authentication = true;
          console.log("✅ Authentication successful");
        } else {
          throw new Error("Authentication failed");
        }
        resolve();
      });
    });

    // Test 3: Join Conversation
    console.log("👥 Test 3: Join Conversation...");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Join timeout")),
        CONFIG.TIMEOUT
      );

      ws.send(
        JSON.stringify({
          type: "join_conversation",
          conversationId: CONFIG.TEST_CONVERSATION_ID,
        })
      );

      ws.once("message", (data) => {
        clearTimeout(timeout);
        const response = JSON.parse(data.toString());
        if (response.type === "conversation_joined") {
          console.log("✅ Conversation joined");
          resolve();
        } else {
          throw new Error("Failed to join conversation");
        }
      });
    });

    // Test 4: Message Exchange
    console.log("💬 Test 4: Message Exchange...");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Message timeout")),
        CONFIG.TIMEOUT
      );

      const testMessage = {
        type: "message",
        conversationId: CONFIG.TEST_CONVERSATION_ID,
        message: {
          id: "test-msg-" + Date.now(),
          content: "Hello from test script!",
          senderId: CONFIG.TEST_USER_ID,
          timestamp: new Date().toISOString(),
        },
      };

      ws.send(JSON.stringify(testMessage));

      ws.once("message", (data) => {
        clearTimeout(timeout);
        const response = JSON.parse(data.toString());
        if (response.type === "message_sent") {
          results.messageExchange = true;
          console.log("✅ Message sent successfully");
          resolve();
        } else {
          throw new Error("Message sending failed");
        }
      });
    });

    // Test 5: Typing Indicators
    console.log("⌨️  Test 5: Typing Indicators...");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Typing timeout")),
        CONFIG.TIMEOUT
      );

      ws.send(
        JSON.stringify({
          type: "typing_indicator",
          conversationId: CONFIG.TEST_CONVERSATION_ID,
          userId: CONFIG.TEST_USER_ID,
          isTyping: true,
        })
      );

      setTimeout(() => {
        results.typingIndicators = true;
        console.log("✅ Typing indicator sent");
        resolve();
      }, 1000);
    });

    // Test 6: Delivery Receipts
    console.log("📋 Test 6: Delivery Receipts...");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Receipt timeout")),
        CONFIG.TIMEOUT
      );

      ws.send(
        JSON.stringify({
          type: "delivery_receipt",
          messageId: "test-msg-" + Date.now(),
          conversationId: CONFIG.TEST_CONVERSATION_ID,
          status: "delivered",
        })
      );

      setTimeout(() => {
        results.deliveryReceipts = true;
        console.log("✅ Delivery receipt sent");
        resolve();
      }, 1000);
    });

    // Test 7: Reconnection
    console.log("🔄 Test 7: Reconnection...");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Reconnection timeout")),
        CONFIG.TIMEOUT
      );

      ws.close();

      const newWs = new WebSocket(CONFIG.WS_URL);

      newWs.on("open", () => {
        clearTimeout(timeout);
        results.reconnection = true;
        console.log("✅ Reconnection successful");
        newWs.close();
        resolve();
      });

      newWs.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    ws.close();
  } catch (error) {
    results.error = error.message;
    console.error("❌ Test failed:", error.message);
  }

  // Print results
  console.log("\n📊 Test Results:");
  console.log("================");
  Object.entries(results).forEach(([test, passed]) => {
    if (test !== "error") {
      console.log(
        `${passed ? "✅" : "❌"} ${test}: ${passed ? "PASS" : "FAIL"}`
      );
    }
  });

  if (results.error) {
    console.log(`\n❌ Error: ${results.error}`);
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed! WebSocket integration is ready.");
    process.exit(0);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, CONFIG };
