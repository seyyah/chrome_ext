export interface AgentAction {
    thought: string;
    action: 'click' | 'type' | 'scroll' | 'navigate' | 'extract' | 'finish' | 'error';
    selector?: string;
    value?: string;
    data?: any;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    content: string | AgentAction; // Content string veya JSON Action olabilir
    timestamp: number;
}
