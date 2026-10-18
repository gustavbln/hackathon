export class ChatError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "ChatError";
    this.code = code;
    this.status = status;
  }
}
