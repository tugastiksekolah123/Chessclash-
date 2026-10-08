import mqtt, { MqttClient } from 'mqtt';
import { Move, PieceColor, ThemeType } from '../chess/types';

export interface P2PPayload {
  type: 'room_join' | 'room_ready' | 'room_leave' | 'move' | 'emote' | 'draw_offer' | 'draw_accept' | 'draw_decline' | 'resign' | 'takeback_request' | 'takeback_accept' | 'takeback_decline' | 'rematch';
  seq: number;
  ts: number;
  roomCode?: string;
  sender?: 'host' | 'guest';
  hostColor?: PieceColor;
  timeControlId?: string;
  theme?: ThemeType;
  move?: Move;
  emote?: string;
  whiteTime?: number;
  blackTime?: number;
}

export type P2PEventHandler = (payload: P2PPayload) => void;

// Public secure WebSocket MQTT brokers (zero-config, high uptime, globally accessible)
const BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt'
];

export class P2PManager {
  private client: MqttClient | null = null;
  private bc: BroadcastChannel | null = null;
  public roomCode: string = '';
  public isHost: boolean = false;
  public role: 'host' | 'guest' = 'host';
  public myColor: PieceColor = 'w';
  public connected: boolean = false;
  public isConnecting: boolean = false;
  public seq: number = 0;
  public lastReceivedSeq: number = 0;
  private currentBrokerIndex: number = 0;
  private joinRetryInterval: number | null = null;

  private onMessageCallbacks: P2PEventHandler[] = [];
  private onStatusCallbacks: ((connected: boolean) => void)[] = [];

  constructor() {
    //
  }

  public onMessage(cb: P2PEventHandler): () => void {
    this.onMessageCallbacks.push(cb);
    return () => {
      this.onMessageCallbacks = this.onMessageCallbacks.filter(c => c !== cb);
    };
  }

  public onStatus(cb: (connected: boolean) => void): () => void {
    this.onStatusCallbacks.push(cb);
    return () => {
      this.onStatusCallbacks = this.onStatusCallbacks.filter(c => c !== cb);
    };
  }

  private notifyStatus(connected: boolean): void {
    if (this.connected !== connected) {
      this.connected = connected;
      this.onStatusCallbacks.forEach(cb => cb(connected));
    }
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CLASH-${code}`;
  }

  public getShareUrl(customCode?: string): string {
    const code = customCode || this.roomCode;
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${encodeURIComponent(code)}`;
  }

  private getTopic(roomCode: string): string {
    const clean = roomCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return `chess-clash-arena/v3/rooms/${clean}`;
  }

  // HOST: Create a new room with a code
  public async createRoom(preferredColor: PieceColor = 'w', customCode?: string): Promise<string> {
    this.disconnect();
    this.isHost = true;
    this.role = 'host';
    this.myColor = preferredColor === 'b' ? 'b' : 'w';
    this.roomCode = (customCode || this.generateRoomCode()).trim().toUpperCase();
    this.seq = 0;
    this.lastReceivedSeq = 0;
    this.isConnecting = true;

    this.setupBroadcastChannel();
    await this.connectMqtt();
    return this.roomCode;
  }

  // GUEST: Join an existing room by code
  public async joinRoom(code: string): Promise<boolean> {
    this.disconnect();
    this.isHost = false;
    this.role = 'guest';
    this.roomCode = code.trim().toUpperCase();
    this.seq = 0;
    this.lastReceivedSeq = 0;
    this.isConnecting = true;

    this.setupBroadcastChannel();
    await this.connectMqtt();

    // Send join request to room
    const sendJoin = () => {
      if (this.isConnecting && !this.connected) {
        this.sendInternal({
          type: 'room_join',
          roomCode: this.roomCode,
          sender: 'guest'
        });
      }
    };

    if (this.joinRetryInterval) clearInterval(this.joinRetryInterval);
    this.joinRetryInterval = window.setInterval(() => {
      if (this.connected || !this.isConnecting) {
        if (this.joinRetryInterval) {
          clearInterval(this.joinRetryInterval);
          this.joinRetryInterval = null;
        }
        return;
      }
      sendJoin();
    }, 1200);

    sendJoin();
    return true;
  }

  private setupBroadcastChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const chanName = `chess_room_${this.roomCode.replace(/[^A-Z0-9]/g, '')}`;
        this.bc = new BroadcastChannel(chanName);
        this.bc.onmessage = (event) => {
          try {
            const payload: P2PPayload = event.data;
            if (payload && payload.sender !== this.role) {
              this.handleIncomingPayload(payload);
            }
          } catch (e) {
            console.warn('BroadcastChannel error:', e);
          }
        };
      } catch (err) {
        console.warn('Could not init BroadcastChannel:', err);
      }
    }
  }

  private connectMqtt(): Promise<void> {
    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      // 4-second timeout guarantee so UI never freezes
      setTimeout(done, 4000);

      const brokerUrl = BROKERS[this.currentBrokerIndex % BROKERS.length];
      const clientId = `chess_${this.role}_${Math.random().toString(16).substring(2, 10)}`;

      try {
        const client = mqtt.connect(brokerUrl, {
          clientId,
          clean: true,
          connectTimeout: 4000,
          reconnectPeriod: 2500,
          keepalive: 30
        });

        this.client = client;
        const topic = this.getTopic(this.roomCode);

        client.on('connect', () => {
          client.subscribe(topic, { qos: 1 }, (err) => {
            if (err) {
              console.warn('MQTT subscribe error:', err);
            }
            done();
          });
        });

        client.on('message', (receivedTopic, message) => {
          if (receivedTopic !== topic) return;
          try {
            const payload: P2PPayload = JSON.parse(message.toString());
            if (payload.sender === this.role) return;
            this.handleIncomingPayload(payload);
          } catch (err) {
            console.warn('Invalid MQTT payload:', err);
          }
        });

        client.on('error', (err) => {
          console.warn('MQTT broker error:', err);
          this.currentBrokerIndex++;
          done();
        });

        client.on('close', () => {
          if (!this.isConnecting && !this.client) {
            this.notifyStatus(false);
          }
        });
      } catch (err) {
        console.error('MQTT setup error:', err);
        done();
      }
    });
  }

  private handleIncomingPayload(payload: P2PPayload): void {
    // 1. Connection Handshake
    if (payload.type === 'room_join') {
      if (this.isHost) {
        // Host confirms connection and sends hostColor
        this.notifyStatus(true);
        this.sendInternal({
          type: 'room_ready',
          roomCode: this.roomCode,
          sender: 'host',
          hostColor: this.myColor
        });
      }
      return;
    }

    if (payload.type === 'room_ready') {
      if (!this.isHost) {
        // Guest adopts opposite of host color
        const hostColor = payload.hostColor || 'w';
        this.myColor = hostColor === 'w' ? 'b' : 'w';
        this.notifyStatus(true);
      }
      return;
    }

    if (payload.type === 'room_leave') {
      this.notifyStatus(false);
      this.onMessageCallbacks.forEach(cb => cb(payload));
      return;
    }

    // 2. Sequence validation for ordered moves
    if (payload.type === 'move') {
      if (payload.seq <= this.lastReceivedSeq) {
        return; // Ignore duplicate move
      }
      this.lastReceivedSeq = payload.seq;
    }

    // 3. Dispatch to all application listeners
    this.onMessageCallbacks.forEach(cb => cb(payload));
  }

  private sendInternal(payload: Omit<P2PPayload, 'seq' | 'ts'>): boolean {
    if (!this.roomCode) return false;
    this.seq++;
    const fullPayload: P2PPayload = {
      ...payload,
      seq: this.seq,
      ts: Date.now(),
      sender: this.role,
      roomCode: this.roomCode
    };

    // 1. Dispatch over local BroadcastChannel
    if (this.bc) {
      try {
        this.bc.postMessage(fullPayload);
      } catch {}
    }

    // 2. Dispatch over MQTT Broker
    if (this.client && this.client.connected) {
      try {
        const topic = this.getTopic(this.roomCode);
        this.client.publish(topic, JSON.stringify(fullPayload), { qos: 1 });
        return true;
      } catch (e) {
        console.error('Error publishing MQTT message:', e);
      }
    }

    return true;
  }

  public send(payload: Omit<P2PPayload, 'seq' | 'ts' | 'sender' | 'roomCode'>): boolean {
    return this.sendInternal(payload);
  }

  public leaveRoom(): void {
    if (this.connected) {
      this.sendInternal({ type: 'room_leave', roomCode: this.roomCode, sender: this.role });
    }
    this.disconnect();
  }

  public disconnect(): void {
    if (this.joinRetryInterval) {
      clearInterval(this.joinRetryInterval);
      this.joinRetryInterval = null;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch {}
      this.bc = null;
    }
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.isConnecting = false;
    this.roomCode = '';
    this.notifyStatus(false);
  }

  // Backwards compatibility helper methods in case any legacy code calls them
  public async createHostOffer(): Promise<string> {
    return this.createRoom();
  }

  public async createGuestAnswer(code: string): Promise<string> {
    await this.joinRoom(code);
    return code;
  }

  public async acceptGuestAnswer(_code: string): Promise<boolean> {
    return this.connected;
  }
}

export const p2p = new P2PManager();
