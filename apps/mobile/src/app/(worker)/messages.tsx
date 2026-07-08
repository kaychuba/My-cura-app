import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { apiClient } from '../../services/api.client';
import { useAuthStore } from '../../stores/auth.store';
import { SwipeableSheet } from '../../components/SwipeableSheet';
import { colors } from '../../theme';

interface Contact { id: string; name: string; role: string }
interface Conversation {
  id: string;
  title?: string;
  participantIds: string[];
  participants: { id: string; name: string }[];
  lastMessageAt?: string;
}
interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Conversation[]>('/messaging/conversations');
      setConversations(data);
    } catch { /* keep current */ }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (conv: Conversation) => {
    try {
      const { data } = await apiClient.get<{ data: Message[] }>(
        `/messaging/conversations/${conv.id}/messages?limit=100`,
      );
      setMessages(data.data);
    } catch { /* ignore */ }
  }, []);

  // Poll the open thread every 5 seconds (live gateway push comes later)
  useEffect(() => {
    if (!active) return;
    loadMessages(active);
    const t = setInterval(() => loadMessages(active), 5000);
    return () => clearInterval(t);
  }, [active, loadMessages]);

  const send = async () => {
    if (!draft.trim() || !active) return;
    setSending(true);
    try {
      await apiClient.post(`/messaging/conversations/${active.id}/messages`, { body: draft.trim() });
      setDraft('');
      await loadMessages(active);
      listRef.current?.scrollToEnd({ animated: true });
    } catch { /* leave draft in the box */ } finally {
      setSending(false);
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    if (contacts === null) {
      try {
        const { data } = await apiClient.get<Contact[]>('/messaging/contacts');
        setContacts(data);
      } catch { setContacts([]); }
    }
  };

  const startWith = async (contact: Contact) => {
    setPickerOpen(false);
    // Reuse an existing 1:1 thread if there is one
    const existing = conversations.find(
      (c) => c.participantIds.length === 2 && c.participantIds.includes(contact.id),
    );
    if (existing) { setActive(existing); return; }
    try {
      const { data } = await apiClient.post<Conversation>('/messaging/conversations', {
        participantIds: [contact.id],
      });
      await loadConversations();
      setActive({ ...data, participants: [{ id: contact.id, name: contact.name }] });
    } catch { /* ignore */ }
  };

  const nameFor = (conv: Conversation) =>
    conv.title ??
    conv.participants.filter((p) => p.id !== user?.id).map((p) => p.name).join(', ');

  // ── Thread view ──
  if (active) {
    const senderName = new Map(active.participants.map((p) => [p.id, p.name]));
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.threadHeader}>
          <TouchableOpacity onPress={() => { setActive(null); loadConversations(); }} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.threadTitle} numberOfLines={1}>{nameFor(active)}</Text>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return (
              <View style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {!mine && (
                    <Text style={styles.bubbleSender}>{senderName.get(item.senderId) ?? 'Colleague'}</Text>
                  )}
                  <Text style={[styles.bubbleText, mine && { color: '#FFFFFF' }]}>{item.body}</Text>
                  <Text style={[styles.bubbleTime, mine && { color: 'rgba(255,255,255,0.7)' }]}>
                    {format(parseISO(item.createdAt), 'HH:mm')}
                  </Text>
                </View>
              </View>
            );
          }}
        />
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!draft.trim() || sending) && { opacity: 0.5 }]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Feather name="send" size={17} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Conversation list ──
  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadConversations(); setRefreshing(false); }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-square" size={30} color={colors.textMuted} />
            <Text style={styles.emptyText}>No conversations yet — start one below</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.convCard} onPress={() => setActive(item)} activeOpacity={0.75}>
            <View style={styles.convAvatar}>
              <Text style={styles.convAvatarText}>{nameFor(item).slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.convName} numberOfLines={1}>{nameFor(item)}</Text>
              {item.lastMessageAt && (
                <Text style={styles.convMeta}>
                  {formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true })}
                </Text>
              )}
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openPicker} activeOpacity={0.85}>
        <Feather name="edit-3" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <SwipeableSheet visible={pickerOpen} onClose={() => setPickerOpen(false)}>
        <View style={styles.pickerBody}>
          <Text style={styles.pickerTitle}>New message</Text>
          {contacts === null ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
          ) : (
            contacts.map((c) => (
              <TouchableOpacity key={c.id} style={styles.contactRow} onPress={() => startWith(c)}>
                <View style={styles.convAvatar}>
                  <Text style={styles.convAvatarText}>{c.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.convName}>{c.name}</Text>
                  <Text style={styles.convMeta}>{c.role.replace(/_/g, ' ')}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </SwipeableSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { alignItems: 'center', paddingTop: 90, gap: 10 },
  emptyText: { fontSize: 14, color: colors.textMuted },

  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  convAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  convAvatarText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  convName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  convMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },

  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5,
  },

  threadHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  threadTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1 },

  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleSender: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  bubbleText: { fontSize: 14, color: colors.textPrimary, lineHeight: 19 },
  bubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 3, alignSelf: 'flex-end' },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  composerInput: {
    flex: 1, backgroundColor: colors.background, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 9, fontSize: 14,
    color: colors.textPrimary, maxHeight: 110,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  pickerBody: { padding: 20, paddingTop: 4, minHeight: 320 },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
});
