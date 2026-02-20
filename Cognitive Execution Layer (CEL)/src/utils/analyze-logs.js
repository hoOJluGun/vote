const fs = require('fs');

// Read and parse the request logs
const logData = JSON.parse(fs.readFileSync('requests-log.json', 'utf8'));

console.log('=== REQUEST LOG ANALYSIS ===\n');

// 1. Basic Statistics
console.log('1. BASIC STATISTICS');
console.log('====================');
console.log(`Total requests: ${logData.length}`);
console.log(`Time period: ${new Date(logData[0].timestamp).toLocaleString()} to ${new Date(logData[logData.length-1].timestamp).toLocaleString()}`);
console.log(`Duration: ${((new Date(logData[logData.length-1].timestamp) - new Date(logData[0].timestamp)) / (1000 * 60 * 60)).toFixed(2)} hours\n`);

// 2. Model Usage Analysis
console.log('2. MODEL USAGE PATTERNS');
console.log('=======================');
const modelUsage = {};
logData.forEach(req => {
    modelUsage[req.model] = (modelUsage[req.model] || 0) + 1;
});

console.log('Model distribution:');
Object.entries(modelUsage)
    .sort(([,a], [,b]) => b - a)
    .forEach(([model, count]) => {
        const percentage = ((count / logData.length) * 100).toFixed(1);
        console.log(`  ${model}: ${count} requests (${percentage}%)`);
    });

// 3. Task Type Analysis
console.log('\n3. TASK TYPE DISTRIBUTION');
console.log('=========================');
const taskTypes = {};
logData.forEach(req => {
    taskTypes[req.taskType] = (taskTypes[req.taskType] || 0) + 1;
});

console.log('Task types:');
Object.entries(taskTypes)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
        const percentage = ((count / logData.length) * 100).toFixed(1);
        console.log(`  ${type}: ${count} requests (${percentage}%)`);
    });

// 4. Token Usage Analysis
console.log('\n4. TOKEN USAGE ANALYSIS');
console.log('=======================');
const tokenData = logData.filter(req => req.tokensIn > 0 || req.tokensOut > 0);
if (tokenData.length > 0) {
    const avgTokensIn = tokenData.reduce((sum, req) => sum + req.tokensIn, 0) / tokenData.length;
    const avgTokensOut = tokenData.reduce((sum, req) => sum + req.tokensOut, 0) / tokenData.length;
    
    console.log(`Average tokens in: ${avgTokensIn.toFixed(1)}`);
    console.log(`Average tokens out: ${avgTokensOut.toFixed(1)}`);
    console.log(`Total tokens processed: ${tokenData.reduce((sum, req) => sum + req.tokensIn + req.tokensOut, 0)}`);
    
    // Token trends
    const earlyTokens = tokenData.slice(0, Math.floor(tokenData.length / 2));
    const lateTokens = tokenData.slice(Math.floor(tokenData.length / 2));
    
    const earlyAvg = earlyTokens.reduce((sum, req) => sum + req.tokensIn, 0) / earlyTokens.length;
    const lateAvg = lateTokens.reduce((sum, req) => sum + req.tokensIn, 0) / lateTokens.length;
    
    console.log(`\nToken trend analysis:`);
    console.log(`  First half average tokens in: ${earlyAvg.toFixed(1)}`);
    console.log(`  Second half average tokens in: ${lateAvg.toFixed(1)}`);
    console.log(`  Trend: ${lateAvg > earlyAvg ? 'Increasing' : lateAvg < earlyAvg ? 'Decreasing' : 'Stable'}`);
}

// 5. Performance Analysis
console.log('\n5. PERFORMANCE METRICS');
console.log('======================');
const validDurations = logData.filter(req => req.duration > 0);
if (validDurations.length > 0) {
    const avgDuration = validDurations.reduce((sum, req) => sum + req.duration, 0) / validDurations.length;
    const minDuration = Math.min(...validDurations.map(req => req.duration));
    const maxDuration = Math.max(...validDurations.map(req => req.duration));
    
    console.log(`Average response time: ${(avgDuration / 1000).toFixed(2)} seconds`);
    console.log(`Min response time: ${(minDuration / 1000).toFixed(2)} seconds`);
    console.log(`Max response time: ${(maxDuration / 1000).toFixed(2)} seconds`);
    
    // Slow requests (> 2 seconds)
    const slowRequests = validDurations.filter(req => req.duration > 2000);
    console.log(`\nSlow requests (> 2s): ${slowRequests.length} (${((slowRequests.length / validDurations.length) * 100).toFixed(1)}%)`);
}

// 6. Client/User Agent Analysis
console.log('\n6. CLIENT ANALYSIS');
console.log('==================');
const userAgents = {};
logData.forEach(req => {
    userAgents[req.userAgent] = (userAgents[req.userAgent] || 0) + 1;
});

console.log('Client distribution:');
Object.entries(userAgents)
    .sort(([,a], [,b]) => b - a)
    .forEach(([agent, count]) => {
        const percentage = ((count / logData.length) * 100).toFixed(1);
        console.log(`  ${agent}: ${count} requests (${percentage}%)`);
    });

// 7. Temporal Patterns
console.log('\n7. TEMPORAL PATTERNS');
console.log('====================');
const hourlyDistribution = {};
logData.forEach(req => {
    const hour = new Date(req.timestamp).getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
});

console.log('Hourly request distribution:');
Object.entries(hourlyDistribution)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([hour, count]) => {
        console.log(`  ${hour.padStart(2, '0')}:00: ${count} requests`);
    });

// Peak hours
const peakHour = Object.entries(hourlyDistribution).reduce((max, curr) => 
    curr[1] > max[1] ? curr : max
);
console.log(`\nPeak hour: ${peakHour[0]}:00 with ${peakHour[1]} requests`);

// 8. Success Rate
console.log('\n8. SUCCESS METRICS');
console.log('==================');
const successful = logData.filter(req => req.status === 200).length;
const successRate = (successful / logData.length) * 100;
console.log(`Success rate: ${successRate.toFixed(1)}% (${successful}/${logData.length})`);

// 9. Cost Analysis
console.log('\n9. COST ANALYSIS');
console.log('================');
const totalCost = logData.reduce((sum, req) => sum + req.estimatedCost, 0);
console.log(`Total estimated cost: $${totalCost.toFixed(4)}`);
console.log(`Average cost per request: $${(totalCost / logData.length).toFixed(6)}`);

// 10. Session Analysis (consecutive requests from same client)
console.log('\n10. SESSION ANALYSIS');
console.log('====================');
let sessions = [];
let currentSession = [];
let lastTimestamp = null;

logData.forEach((req, index) => {
    const currentTs = new Date(req.timestamp).getTime();
    
    if (!lastTimestamp || (currentTs - lastTimestamp) <= 30 * 60 * 1000) { // 30 minutes
        currentSession.push(req);
    } else {
        if (currentSession.length > 1) {
            sessions.push(currentSession);
        }
        currentSession = [req];
    }
    lastTimestamp = currentTs;
});

// Add last session
if (currentSession.length > 1) {
    sessions.push(currentSession);
}

console.log(`Identified ${sessions.length} sessions with multiple requests:`);
sessions.forEach((session, i) => {
    const duration = (new Date(session[session.length-1].timestamp) - new Date(session[0].timestamp)) / 1000;
    console.log(`  Session ${i+1}: ${session.length} requests over ${duration.toFixed(0)} seconds`);
});

console.log('\n=== ANALYSIS COMPLETE ===');