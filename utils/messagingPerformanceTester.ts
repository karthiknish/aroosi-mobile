import { Message } from "../types/message";
import { MessageCache } from "./MessageCache";
import {
  MessagingPerformanceOptimizer,
  OptimizationConfig,
} from "./messagingPerformanceOptimizer";
import { ApiResponse } from "../types/messaging";

export interface PerformanceTestConfig {
  /**
   * Number of test messages to generate
   */
  messageCount: number;

  /**
   * Number of test conversations
   */
  conversationCount: number;

  /**
   * Number of concurrent operations to test
   */
  concurrency: number;

  /**
   * Test duration in milliseconds
   */
  duration: number;

  /**
   * Whether to test cache performance
   */
  testCache: boolean;

  /**
   * Whether to test optimistic updates
   */
  testOptimistic: boolean;

  /**
   * Whether to test API batching
   */
  testBatching: boolean;

  /**
   * Simulated network delay in milliseconds
   */
  networkDelay: number;

  /**
   * Simulated error rate (0-1)
   */
  errorRate: number;
}

export interface PerformanceTestResult {
  /**
   * Test configuration used
   */
  config: PerformanceTestConfig;

  /**
   * Test duration in milliseconds
   */
  duration: number;

  /**
   * Cache performance results
   */
  cacheResults?: {
    hitRate: number;
    averageHitTime: number;
    averageMissTime: number;
    totalOperations: number;
  };

  /**
   * Optimistic update results
   */
  optimisticResults?: {
    successRate: number;
    averageConfirmTime: number;
    totalUpdates: number;
    failedUpdates: number;
  };

  /**
   * API batching results
   */
  batchingResults?: {
    batchEfficiency: number;
    averageBatchSize: number;
    totalBatches: number;
    totalRequests: number;
  };

  /**
   * Memory usage results
   */
  memoryResults: {
    initialMemory: number;
    peakMemory: number;
    finalMemory: number;
    memoryGrowth: number;
  };

  /**
   * Overall performance score (0-100)
   */
  performanceScore: number;

  /**
   * Performance recommendations
   */
  recommendations: string[];

  /**
   * Detailed timing data
   */
  timingData: {
    operation: string;
    duration: number;
    timestamp: number;
  }[];
}

export class MessagingPerformanceTester {
  private messageCache: MessageCache;
  private optimizer: MessagingPerformanceOptimizer;
  private testMessages: Message[] = [];
  private testConversationIds: string[] = [];
  private timingData: {
    operation: string;
    duration: number;
    timestamp: number;
  }[] = [];

  constructor(
    messageCache?: MessageCache,
    optimizerConfig?: Partial<OptimizationConfig>
  ) {
    this.messageCache = messageCache || new MessageCache();
    this.optimizer = new MessagingPerformanceOptimizer(
      this.messageCache,
      optimizerConfig
    );
  }

  /**
   * Run comprehensive performance tests
   */
  async runPerformanceTests(
    config: Partial<PerformanceTestConfig> = {}
  ): Promise<PerformanceTestResult> {
    const testConfig: PerformanceTestConfig = {
      messageCount: 1000,
      conversationCount: 10,
      concurrency: 5,
      duration: 30000, // 30 seconds
      testCache: true,
      testOptimistic: true,
      testBatching: true,
      networkDelay: 100,
      errorRate: 0.05,
      ...config,
    };

    console.log("Starting performance tests with config:", testConfig);

    const startTime = Date.now();
    const initialMemory = this.estimateMemoryUsage();

    // Generate test data
    await this.generateTestData(testConfig);

    const results: Partial<PerformanceTestResult> = {
      config: testConfig,
      timingData: [],
      memoryResults: {
        initialMemory,
        peakMemory: initialMemory,
        finalMemory: 0,
        memoryGrowth: 0,
      },
    };

    // Run cache performance tests
    if (testConfig.testCache) {
      results.cacheResults = await this.testCachePerformance(testConfig);
    }

    // Run optimistic update tests
    if (testConfig.testOptimistic) {
      results.optimisticResults = await this.testOptimisticUpdates(testConfig);
    }

    // Run batching tests
    if (testConfig.testBatching) {
      results.batchingResults = await this.testApiBatching(testConfig);
    }

    // Calculate final memory usage
    const finalMemory = this.estimateMemoryUsage();
    results.memoryResults!.finalMemory = finalMemory;
    results.memoryResults!.memoryGrowth = finalMemory - initialMemory;

    // Calculate performance score and recommendations
    const duration = Date.now() - startTime;
    results.duration = duration;
    results.timingData = this.timingData;
    results.performanceScore = this.calculatePerformanceScore(
      results as PerformanceTestResult
    );
    results.recommendations = this.generateRecommendations(
      results as PerformanceTestResult
    );

    console.log("Performance tests completed in", duration, "ms");

    return results as PerformanceTestResult;
  }

  /**
   * Test cache performance
   */
  private async testCachePerformance(config: PerformanceTestConfig): Promise<{
    hitRate: number;
    averageHitTime: number;
    averageMissTime: number;
    totalOperations: number;
  }> {
    console.log("Testing cache performance...");

    let hits = 0;
    let misses = 0;
    let hitTimes: number[] = [];
    let missTimes: number[] = [];

    const operations = config.messageCount;

    for (let i = 0; i < operations; i++) {
      const conversationId =
        this.testConversationIds[i % this.testConversationIds.length];
      const startTime = Date.now();

      const cachedMessages = this.messageCache.get(conversationId);
      const duration = Date.now() - startTime;

      if (cachedMessages) {
        hits++;
        hitTimes.push(duration);
      } else {
        misses++;
        missTimes.push(duration);

        // Simulate loading and caching
        const messages = this.testMessages.filter(
          (m) => m.conversationId === conversationId
        );
        this.messageCache.set(conversationId, messages);
      }

      this.recordTiming("cache-operation", duration);
    }

    return {
      hitRate: hits / (hits + misses),
      averageHitTime:
        hitTimes.length > 0
          ? hitTimes.reduce((sum, t) => sum + t, 0) / hitTimes.length
          : 0,
      averageMissTime:
        missTimes.length > 0
          ? missTimes.reduce((sum, t) => sum + t, 0) / missTimes.length
          : 0,
      totalOperations: operations,
    };
  }

  /**
   * Test optimistic updates
   */
  private async testOptimisticUpdates(config: PerformanceTestConfig): Promise<{
    successRate: number;
    averageConfirmTime: number;
    totalUpdates: number;
    failedUpdates: number;
  }> {
    console.log("Testing optimistic updates...");

    let successCount = 0;
    let failedCount = 0;
    let confirmTimes: number[] = [];

    const updates = Math.min(config.messageCount / 10, 100); // Limit optimistic tests

    for (let i = 0; i < updates; i++) {
      const conversationId =
        this.testConversationIds[i % this.testConversationIds.length];
      const message = this.createTestMessage(
        conversationId,
        `Optimistic test ${i}`
      );

      try {
        const startTime = Date.now();

        await this.optimizer.sendMessageOptimistic(
          message,
          this.createMockApiCall(config.networkDelay, config.errorRate)
        );

        const confirmTime = Date.now() - startTime;
        confirmTimes.push(confirmTime);
        successCount++;

        this.recordTiming("optimistic-success", confirmTime);
      } catch (error) {
        failedCount++;
        this.recordTiming("optimistic-failure", Date.now() - Date.now());
      }
    }

    return {
      successRate: successCount / (successCount + failedCount),
      averageConfirmTime:
        confirmTimes.length > 0
          ? confirmTimes.reduce((sum, t) => sum + t, 0) / confirmTimes.length
          : 0,
      totalUpdates: updates,
      failedUpdates: failedCount,
    };
  }

  /**
   * Test API batching
   */
  private async testApiBatching(config: PerformanceTestConfig): Promise<{
    batchEfficiency: number;
    averageBatchSize: number;
    totalBatches: number;
    totalRequests: number;
  }> {
    console.log("Testing API batching...");

    // This is a simplified test - in reality, batching would be more complex
    const requests = config.messageCount / 10;
    const expectedBatches = Math.ceil(requests / 5); // Assuming batch size of 5

    let actualBatches = 0;
    let totalRequests = 0;

    // Simulate batched requests
    for (let i = 0; i < requests; i += 5) {
      const batchSize = Math.min(5, requests - i);
      actualBatches++;
      totalRequests += batchSize;

      // Simulate batch processing time
      await this.delay(config.networkDelay);
      this.recordTiming("batch-request", config.networkDelay);
    }

    return {
      batchEfficiency: expectedBatches / actualBatches,
      averageBatchSize: totalRequests / actualBatches,
      totalBatches: actualBatches,
      totalRequests,
    };
  }

  /**
   * Generate test data
   */
  private async generateTestData(config: PerformanceTestConfig): Promise<void> {
    console.log("Generating test data...");

    // Generate conversation IDs
    this.testConversationIds = [];
    for (let i = 0; i < config.conversationCount; i++) {
      this.testConversationIds.push(`test-conversation-${i}`);
    }

    // Generate test messages
    this.testMessages = [];
    for (let i = 0; i < config.messageCount; i++) {
      const conversationId =
        this.testConversationIds[i % config.conversationCount];
      const message = this.createTestMessage(
        conversationId,
        `Test message ${i}`
      );
      this.testMessages.push(message);
    }

    console.log(
      `Generated ${this.testMessages.length} messages across ${this.testConversationIds.length} conversations`
    );
  }

  /**
   * Create a test message
   */
  private createTestMessage(conversationId: string, text: string): Message {
    return {
      _id: `test-message-${Date.now()}-${Math.random()}`,
      conversationId,
      fromUserId: "test-user-1",
      toUserId: "test-user-2",
      text,
      type: "text",
      createdAt: Date.now(),
      status: "sent",
    };
  }

  /**
   * Create mock API call for testing
   */
  private createMockApiCall(delay: number, errorRate: number) {
    return async (messageData: any): Promise<ApiResponse<Message>> => {
      await this.delay(delay);

      if (Math.random() < errorRate) {
        return {
          success: false,
          error: {
            code: "TEST_ERROR",
            message: "Simulated API error",
          },
        };
      }

      return {
        success: true,
        data: {
          ...messageData,
          _id: `api-message-${Date.now()}-${Math.random()}`,
          createdAt: Date.now(),
        },
      };
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(results: PerformanceTestResult): number {
    let score = 100;

    // Cache performance (30% weight)
    if (results.cacheResults) {
      const cacheScore = results.cacheResults.hitRate * 30;
      score = score - 30 + cacheScore;
    }

    // Optimistic updates (25% weight)
    if (results.optimisticResults) {
      const optimisticScore = results.optimisticResults.successRate * 25;
      score = score - 25 + optimisticScore;
    }

    // Memory efficiency (20% weight)
    const memoryGrowthPenalty = Math.min(
      20,
      (results.memoryResults.memoryGrowth / (1024 * 1024)) * 2
    ); // 2 points per MB
    score -= memoryGrowthPenalty;

    // Response time (25% weight)
    const avgResponseTime =
      results.timingData.reduce((sum, t) => sum + t.duration, 0) /
      results.timingData.length;
    const responseScore = Math.max(0, 25 - avgResponseTime / 100); // Penalty for slow responses
    score = score - 25 + responseScore;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(results: PerformanceTestResult): string[] {
    const recommendations: string[] = [];

    if (results.cacheResults && results.cacheResults.hitRate < 0.7) {
      recommendations.push(
        "Consider increasing cache size or TTL to improve hit rate"
      );
    }

    if (
      results.optimisticResults &&
      results.optimisticResults.successRate < 0.9
    ) {
      recommendations.push(
        "High optimistic update failure rate - check network stability"
      );
    }

    if (results.memoryResults.memoryGrowth > 10 * 1024 * 1024) {
      // 10MB
      recommendations.push(
        "High memory growth detected - consider implementing memory cleanup"
      );
    }

    const avgResponseTime =
      results.timingData.reduce((sum, t) => sum + t.duration, 0) /
      results.timingData.length;
    if (avgResponseTime > 1000) {
      recommendations.push(
        "Average response time is high - consider optimizing API calls"
      );
    }

    if (results.performanceScore < 70) {
      recommendations.push(
        "Overall performance is below optimal - review all optimization strategies"
      );
    }

    return recommendations;
  }

  /**
   * Record timing data
   */
  private recordTiming(operation: string, duration: number): void {
    this.timingData.push({
      operation,
      duration,
      timestamp: Date.now(),
    });
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimate based on cached data
    const stats = this.messageCache.getStats();
    return stats.totalMessages * 1024; // 1KB per message estimate
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up test data and resources
   */
  destroy(): void {
    this.messageCache.clear();
    this.optimizer.destroy();
    this.testMessages = [];
    this.testConversationIds = [];
    this.timingData = [];
  }
}

/**
 * Run quick performance benchmark
 */
export async function runQuickPerformanceBenchmark(): Promise<PerformanceTestResult> {
  const tester = new MessagingPerformanceTester();

  try {
    const results = await tester.runPerformanceTests({
      messageCount: 100,
      conversationCount: 5,
      duration: 5000, // 5 seconds
      networkDelay: 50,
      errorRate: 0.02,
    });

    console.log("Quick benchmark results:", {
      score: results.performanceScore,
      cacheHitRate: results.cacheResults?.hitRate,
      optimisticSuccessRate: results.optimisticResults?.successRate,
      memoryGrowth: results.memoryResults.memoryGrowth,
    });

    return results;
  } finally {
    tester.destroy();
  }
}

/**
 * Run comprehensive performance test suite
 */
export async function runComprehensivePerformanceTests(): Promise<PerformanceTestResult> {
  const tester = new MessagingPerformanceTester();

  try {
    const results = await tester.runPerformanceTests({
      messageCount: 1000,
      conversationCount: 20,
      duration: 30000, // 30 seconds
      networkDelay: 100,
      errorRate: 0.05,
    });

    console.log("Comprehensive test results:", {
      score: results.performanceScore,
      recommendations: results.recommendations,
    });

    return results;
  } finally {
    tester.destroy();
  }
}
