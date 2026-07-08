import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@my-cura/ui-web';
import { apiClient } from '../../services/api.client';
import { useAuthStore } from '../../stores/auth.store';

interface Contact { id: string; name: string; role: string }
interface Conversation {
  id: string;
  title?: string;
  participantIds: string[];
  participants: { id: string; name: string }[];
  lastMessageAt?: string;
}
interface Message { id: string; senderId: string; body: string; createdAt: string }

export function MessagingPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => (await apiClient.get('/messaging/conversations')).data,
    refetchInterval: 15_000,
  });

  const active = useMemo(
    () => (conversations ?? []).find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const { data: messages } = useQuery<{ data: Message[] }>({
    queryKey: ['messages', activeId],
    queryFn: async () =>
      (await apiClient.get(`/messaging/conversations/${activeId}/messages?limit=100`)).data,
    enabled: !!activeId,
    refetchInterval: 5_000,
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['messaging-contacts'],
    queryFn: async () => (await apiClient.get('/messaging/contacts')).data,
    enabled: newOpen,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.data?.length]);

  const send = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/messaging/conversations/${activeId}/messages`, { body }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['messages', activeId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('Message failed to send'),
  });

  const start = useMutation({
    mutationFn: (contact: Contact) =>
      apiClient.post('/messaging/conversations', { participantIds: [contact.id] }),
    onSuccess: async (res) => {
      setNewOpen(false);
      await qc.invalidateQueries({ queryKey: ['conversations'] });
      setActiveId(res.data.id);
    },
    onError: () => toast.error('Could not start the conversation'),
  });

  const nameFor = (conv: Conversation) =>
    conv.title ??
    conv.participants.filter((p) => p.id !== user?.id).map((p) => p.name).join(', ') ??
    'Conversation';

  const senderName = new Map((active?.participants ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-500" />
          </div>
          <h1 className="page-header">Messaging</h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4" /> New Conversation
        </button>
      </div>

      <div className="card overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[520px]">
        {/* Conversation list */}
        <div className="border-r border-slate-100 dark:border-slate-700 overflow-y-auto max-h-[640px]">
          {(conversations ?? []).length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">No conversations yet</p>
          ) : (
            (conversations ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                  activeId === c.id ? 'bg-primary-50/60 dark:bg-primary-900/20' : ''
                }`}
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{nameFor(c)}</p>
                {c.lastMessageAt && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(c.lastMessageAt).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="md:col-span-2 flex flex-col max-h-[640px]">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a conversation, or start a new one
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{nameFor(active)}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-2">
                {(messages?.data ?? []).map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          mine
                            ? 'bg-primary-500 text-white rounded-br-md'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md'
                        }`}
                      >
                        {!mine && (
                          <p className="text-[11px] font-bold text-primary-600 dark:text-primary-300 mb-0.5">
                            {senderName.get(m.senderId) ?? 'Colleague'}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-end gap-2">
                <textarea
                  className="input flex-1 min-h-[42px] max-h-32 resize-none"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (draft.trim()) send.mutate(draft.trim());
                    }
                  }}
                />
                <button
                  className="btn-primary p-2.5 disabled:opacity-50"
                  disabled={!draft.trim() || send.isPending}
                  onClick={() => send.mutate(draft.trim())}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Conversation" size="sm">
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {(contacts ?? []).map((c) => (
            <button
              key={c.id}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3"
              onClick={() => start.mutate(c)}
            >
              <span className="w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-600">
                {c.name[0]}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                <span className="block text-xs text-slate-400 capitalize">{c.role.replace(/_/g, ' ')}</span>
              </span>
            </button>
          ))}
          {contacts && contacts.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">No colleagues found</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
