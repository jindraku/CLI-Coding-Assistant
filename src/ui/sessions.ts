import fs from "node:fs";
import path from "node:path";
import { ChatMessage } from "../providers/types.js";

export interface SavedSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  messages: ChatMessage[];
}

interface SessionData {
  sessions: SavedSession[];
}

export class SessionStore {
  private filePath: string;

  constructor(cwd: string) {
    this.filePath = path.join(cwd, ".forgepilot", "sessions.json");
  }

  listRecent(limit = 5): SavedSession[] {
    return this.read()
      .sessions
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  get(id: string): SavedSession | undefined {
    return this.read().sessions.find((session) => session.id === id);
  }

  create(title: string): SavedSession {
    const now = new Date().toISOString();
    const session: SavedSession = {
      id: createId(),
      createdAt: now,
      updatedAt: now,
      title,
      messages: [],
    };

    const data = this.read();
    data.sessions.unshift(session);
    this.write(data);
    return session;
  }

  append(id: string, messages: ChatMessage[], fallbackTitle?: string): SavedSession {
    const data = this.read();
    let session = data.sessions.find((item) => item.id === id);

    if (!session) {
      session = {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: fallbackTitle ?? "New session",
        messages: [],
      };
      data.sessions.unshift(session);
    }

    session.messages.push(...messages);
    session.updatedAt = new Date().toISOString();

    if ((session.title === "New session" || !session.title) && fallbackTitle) {
      session.title = fallbackTitle;
    }

    this.write(data);
    return session;
  }

  formatRecent(limit = 5): string[] {
    return this.listRecent(limit).map((session, index) => {
      const stamp = formatTimestamp(session.updatedAt);
      const preview = truncate(session.title, 70);
      return `${index + 1}. ${stamp}  ${preview}`;
    });
  }

  private read(): SessionData {
    if (!fs.existsSync(this.filePath)) {
      return { sessions: [] };
    }

    const raw = fs.readFileSync(this.filePath, "utf8");
    return JSON.parse(raw) as SessionData;
  }

  private write(data: SessionData): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  const pad = (num: number) => num.toString().padStart(2, "0");
  return `[${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}]`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}
