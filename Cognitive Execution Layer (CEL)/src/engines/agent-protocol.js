/**
 * Agent Communication Protocol
 * Implements secure, reliable communication between autonomous agents
 */
import crypto from 'crypto';
import EventEmitter from 'events';

export class AgentProtocol extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      messageTimeout: options.messageTimeout || 30000,
      maxRetries: options.maxRetries || 3,
      encryptionEnabled: options.encryptionEnabled !== false,
      signatureVerification: options.signatureVerification !== false,
      maxMessageSize: options.maxMessageSize || 1024 * 1024, // 1MB
      ...options
    };
    
    // Agent registry
    this.agents = new Map();
    this.agentConnections = new Map();
    this.pendingMessages = new Map();
    this.messageHistory = [];
    this.maxHistorySize = 1000;
    
    // Security
    this.encryptionKeys = new Map();
    this.signatures = new Map();
    
    // Statistics
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesFailed: 0,
      agentsRegistered: 0,
      connectionAttempts: 0
    };
    
    // Message queues
    this.messageQueues = new Map();
    this.processingQueue = false;
  }

  /**
   * Register an agent in the protocol
   */
  registerAgent(agentId, agentSpec) {
    if (this.agents.has(agentId)) {
      console.warn(`Agent ${agentId} already registered`);
      return false;
    }
    
    const agentInfo = {
      id: agentId,
      ...agentSpec,
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: 'online',
      capabilities: agentSpec.capabilities || [],
      supportedProtocols: agentSpec.protocols || ['json'],
      securityLevel: agentSpec.securityLevel || 'standard'
    };
    
    this.agents.set(agentId, agentInfo);
    this.agentConnections.set(agentId, {
      connected: true,
      lastPing: Date.now(),
      connectionId: this.generateConnectionId()
    });
    
    this.messageQueues.set(agentId, []);
    this.stats.agentsRegistered++;
    
    // Emit registration event
    this.emit('agentRegistered', agentInfo);
    
    console.log(`[AgentProtocol] Registered agent: ${agentId}`);
    return true;
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId) {
    if (!this.agents.has(agentId)) {
      return false;
    }
    
    const agentInfo = this.agents.get(agentId);
    this.agents.delete(agentId);
    this.agentConnections.delete(agentId);
    this.messageQueues.delete(agentId);
    
    // Emit unregister event
    this.emit('agentUnregistered', agentInfo);
    
    console.log(`[AgentProtocol] Unregistered agent: ${agentId}`);
    return true;
  }

  /**
   * Send a direct message between agents
   */
  async sendMessage(fromAgent, toAgent, message, options = {}) {
    // Validate agents exist
    if (!this.agents.has(fromAgent)) {
      throw new Error(`Sender agent ${fromAgent} not registered`);
    }
    
    if (!this.agents.has(toAgent)) {
      throw new Error(`Recipient agent ${toAgent} not registered`);
    }
    
    // Create message envelope
    const messageId = this.generateMessageId();
    const timestamp = Date.now();
    
    const envelope = {
      id: messageId,
      from: fromAgent,
      to: toAgent,
      timestamp,
      ttl: options.ttl || 300000, // 5 minutes default
      priority: options.priority || 'normal',
      type: options.type || 'direct',
      encrypted: this.options.encryptionEnabled,
      signed: this.options.signatureVerification,
      payload: message,
      metadata: {
        correlationId: options.correlationId,
        replyTo: options.replyTo,
        contentType: options.contentType || 'application/json',
        ...options.metadata
      }
    };
    
    // Apply security measures
    const securedEnvelope = await this.secureMessage(envelope, fromAgent);
    
    // Validate message size
    const messageSize = JSON.stringify(securedEnvelope).length;
    if (messageSize > this.options.maxMessageSize) {
      throw new Error(`Message too large: ${messageSize} bytes > ${this.options.maxMessageSize}`);
    }
    
    // Add to message history
    this.recordMessage(securedEnvelope);
    
    // Queue message for delivery
    const deliveryResult = await this.queueMessage(toAgent, securedEnvelope, options);
    
    this.stats.messagesSent++;
    
    // Emit message sent event
    this.emit('messageSent', {
      messageId,
      from: fromAgent,
      to: toAgent,
      timestamp,
      success: deliveryResult.success
    });
    
    return {
      success: deliveryResult.success,
      messageId,
      queued: deliveryResult.queued,
      timestamp
    };
  }

  /**
   * Broadcast message to multiple agents
   */
  async broadcastMessage(fromAgent, message, recipients = null, options = {}) {
    if (!this.agents.has(fromAgent)) {
      throw new Error(`Broadcast sender ${fromAgent} not registered`);
    }
    
    // Determine recipients
    const targetAgents = recipients || Array.from(this.agents.keys())
      .filter(id => id !== fromAgent);
    
    if (targetAgents.length === 0) {
      return {
        success: true,
        messageId: null,
        recipients: [],
        timestamp: Date.now()
      };
    }
    
    // Create broadcast envelope
    const messageId = this.generateMessageId();
    const timestamp = Date.now();
    
    const broadcastEnvelope = {
      id: messageId,
      from: fromAgent,
      to: targetAgents,
      timestamp,
      ttl: options.ttl || 300000,
      priority: options.priority || 'normal',
      type: 'broadcast',
      encrypted: this.options.encryptionEnabled,
      signed: this.options.signatureVerification,
      payload: message,
      metadata: {
        broadcast: true,
        recipientCount: targetAgents.length,
        ...options.metadata
      }
    };
    
    // Secure the broadcast message
    const securedEnvelope = await this.secureMessage(broadcastEnvelope, fromAgent);
    this.recordMessage(securedEnvelope);
    
    // Send to all recipients
    const results = await Promise.all(
      targetAgents.map(async (recipient) => {
        try {
          const result = await this.queueMessage(recipient, {
            ...securedEnvelope,
            to: recipient,
            id: `${messageId}-${recipient}`
          }, options);
          
          return {
            recipient,
            success: result.success,
            error: result.error
          };
        } catch (error) {
          return {
            recipient,
            success: false,
            error: error.message
          };
        }
      })
    );
    
    const successfulRecipients = results.filter(r => r.success).map(r => r.recipient);
    const failedRecipients = results.filter(r => !r.success);
    
    this.stats.messagesSent += successfulRecipients.length;
    
    // Emit broadcast event
    this.emit('messageBroadcast', {
      messageId,
      from: fromAgent,
      recipients: successfulRecipients,
      failed: failedRecipients,
      timestamp
    });
    
    return {
      success: successfulRecipients.length > 0,
      messageId,
      successfulRecipients,
      failedRecipients,
      timestamp
    };
  }

  /**
   * Send a reply to a message
   */
  async sendReply(originalMessage, replyPayload, options = {}) {
    const replyOptions = {
      ...options,
      correlationId: originalMessage.id,
      replyTo: originalMessage.from
    };
    
    return await this.sendMessage(
      originalMessage.to,
      originalMessage.from,
      replyPayload,
      replyOptions
    );
  }

  /**
   * Process incoming messages for an agent
   */
  async processMessages(agentId, processor) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not registered`);
    }
    
    const queue = this.messageQueues.get(agentId);
    if (!queue || queue.length === 0) {
      return { processed: 0, messages: [] };
    }
    
    const messagesToProcess = [...queue];
    this.messageQueues.set(agentId, []);
    
    const processedMessages = [];
    
    for (const message of messagesToProcess) {
      try {
        // Verify message authenticity
        const verifiedMessage = await this.verifyMessage(message);
        
        // Decrypt if necessary
        const decryptedMessage = await this.decryptMessage(verifiedMessage);
        
        // Process the message
        const result = await processor(decryptedMessage);
        
        processedMessages.push({
          message: decryptedMessage,
          result,
          success: true,
          processedAt: new Date().toISOString()
        });
        
        this.stats.messagesReceived++;
        
      } catch (error) {
        processedMessages.push({
          message,
          error: error.message,
          success: false,
          processedAt: new Date().toISOString()
        });
        
        this.stats.messagesFailed++;
        console.error(`[AgentProtocol] Message processing failed: ${error.message}`);
      }
    }
    
    // Emit processing complete event
    this.emit('messagesProcessed', {
      agentId,
      count: processedMessages.length,
      successful: processedMessages.filter(m => m.success).length,
      timestamp: Date.now()
    });
    
    return {
      processed: processedMessages.length,
      messages: processedMessages
    };
  }

  /**
   * Get pending messages for an agent
   */
  getPendingMessages(agentId) {
    const queue = this.messageQueues.get(agentId) || [];
    return queue.map(msg => ({
      id: msg.id,
      from: msg.from,
      timestamp: msg.timestamp,
      type: msg.type,
      priority: msg.priority
    }));
  }

  /**
   * Acknowledge message receipt
   */
  acknowledgeMessage(agentId, messageId) {
    const agentQueue = this.messageQueues.get(agentId);
    if (agentQueue) {
      const index = agentQueue.findIndex(msg => msg.id === messageId);
      if (index !== -1) {
        agentQueue.splice(index, 1);
        this.emit('messageAcknowledged', { agentId, messageId });
        return true;
      }
    }
    return false;
  }

  /**
   * Get agent information
   */
  getAgentInfo(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get all registered agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Check if agent is online
   */
  isAgentOnline(agentId) {
    const connection = this.agentConnections.get(agentId);
    if (!connection) return false;
    
    const timeSinceLastPing = Date.now() - connection.lastPing;
    return connection.connected && timeSinceLastPing < 60000; // 1 minute timeout
  }

  /**
   * Ping an agent to check connectivity
   */
  async pingAgent(agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not registered`);
    }
    
    const pingMessage = {
      type: 'ping',
      timestamp: Date.now()
    };
    
    try {
      const result = await this.sendMessage('system', agentId, pingMessage, {
        ttl: 5000,
        priority: 'high'
      });
      
      if (result.success) {
        const connection = this.agentConnections.get(agentId);
        if (connection) {
          connection.lastPing = Date.now();
        }
      }
      
      return result;
      
    } catch (error) {
      const connection = this.agentConnections.get(agentId);
      if (connection) {
        connection.connected = false;
      }
      throw error;
    }
  }

  /**
   * Get protocol statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeAgents: this.agents.size,
      connectedAgents: Array.from(this.agentConnections.values())
        .filter(conn => conn.connected).length,
      pendingMessages: Array.from(this.messageQueues.values())
        .reduce((sum, queue) => sum + queue.length, 0),
      messageHistorySize: this.messageHistory.length
    };
  }

  /**
   * Get message history
   */
  getMessageHistory(limit = 50) {
    return this.messageHistory.slice(-limit);
  }

  // Private helper methods
  async queueMessage(agentId, message, options) {
    const queue = this.messageQueues.get(agentId);
    if (!queue) {
      throw new Error(`No message queue for agent ${agentId}`);
    }
    
    // Add to queue
    queue.push(message);
    
    // Process queue if not already processing
    if (!this.processingQueue) {
      this.processingQueue = true;
      setImmediate(() => this.processQueues());
    }
    
    return {
      success: true,
      queued: true,
      queuePosition: queue.length - 1
    };
  }

  async processQueues() {
    // Process messages in queues
    for (const [agentId, queue] of this.messageQueues.entries()) {
      if (queue.length > 0) {
        this.emit('agentHasMessages', { agentId, count: queue.length });
      }
    }
    
    this.processingQueue = false;
  }

  async secureMessage(envelope, senderId) {
    let secured = { ...envelope };
    
    // Sign message if verification enabled
    if (this.options.signatureVerification) {
      secured.signature = await this.signMessage(envelope, senderId);
    }
    
    // Encrypt message if encryption enabled
    if (this.options.encryptionEnabled) {
      secured.payload = await this.encryptPayload(secured.payload, envelope.to);
    }
    
    return secured;
  }

  async verifyMessage(envelope) {
    if (this.options.signatureVerification && envelope.signature) {
      const isValid = await this.verifySignature(envelope);
      if (!isValid) {
        throw new Error('Message signature verification failed');
      }
    }
    return envelope;
  }

  async decryptMessage(envelope) {
    if (this.options.encryptionEnabled && envelope.encrypted) {
      envelope.payload = await this.decryptPayload(envelope.payload, envelope.to);
    }
    return envelope;
  }

  async signMessage(message, agentId) {
    // In production, use proper cryptographic signing
    const messageString = JSON.stringify({
      id: message.id,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
      payload: message.payload
    });
    
    return crypto
      .createHash('sha256')
      .update(messageString)
      .digest('hex');
  }

  async verifySignature(envelope) {
    // In production, use proper signature verification
    const expectedSignature = await this.signMessage(
      { ...envelope, signature: undefined },
      envelope.from
    );
    
    return envelope.signature === expectedSignature;
  }

  async encryptPayload(payload, recipientId) {
    // In production, use proper encryption
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  async decryptPayload(encryptedPayload, recipientId) {
    // In production, use proper decryption
    return JSON.parse(Buffer.from(encryptedPayload, 'base64').toString());
  }

  generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  generateConnectionId() {
    return `conn-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  recordMessage(envelope) {
    this.messageHistory.push({
      ...envelope,
      recordedAt: new Date().toISOString()
    });
    
    // Trim history
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Shutdown the protocol
   */
  async shutdown() {
    console.log('[AgentProtocol] Shutting down...');
    
    // Disconnect all agents
    for (const [agentId] of this.agents) {
      this.unregisterAgent(agentId);
    }
    
    this.messageQueues.clear();
    this.pendingMessages.clear();
    this.messageHistory = [];
    
    this.emit('shutdown');
    console.log('[AgentProtocol] Shutdown complete');
  }
}